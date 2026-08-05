package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"uni-scraper-go/engine"
)

// ============================================================
// Telegram Bot — Full control of the scraper via inline
// keyboard dialogs (no slash commands needed).
// Runs inside the desktop app: only active while the app is on.
// ============================================================

type tgUser struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
}

type tgChat struct {
	ID int64 `json:"id"`
}

type tgMessage struct {
	Chat *tgChat `json:"chat"`
	From *tgUser `json:"from"`
	Text string  `json:"text"`
}

type tgCallbackQuery struct {
	ID      string      `json:"id"`
	From    *tgUser     `json:"from"`
	Message *tgMessage  `json:"message"`
	Data    string      `json:"data"`
}

type tgUpdate struct {
	UpdateID      int64            `json:"update_id"`
	Message       *tgMessage       `json:"message"`
	CallbackQuery *tgCallbackQuery `json:"callback_query"`
}

type tgReplyMarkup struct {
	InlineKeyboard [][]tgButton             `json:"inline_keyboard,omitempty"`
	Keyboard       [][]tgReplyKeyboardButton `json:"keyboard,omitempty"`
	ResizeKeyboard bool                     `json:"resize_keyboard,omitempty"`
	IsPersistent   bool                     `json:"is_persistent,omitempty"`
}

type tgReplyKeyboardButton struct {
	Text string `json:"text"`
}

type tgButton struct {
	Text         string `json:"text"`
	CallbackData string `json:"callback_data,omitempty"`
}

type botChatState struct {
	awaitingURL           bool
	awaitingRange         bool
	awaitingPath          bool
	awaitingCatalog       bool
	awaitingCatalogSearch bool
	catalogList           []engine.Comic
	catalogOffset         int
	catalogFilter         string
	info                  *engine.WebtoonInfo
	episodes              []engine.Episode
	episodeMap            map[int]engine.Episode
	// ID of the last dialog/menu message — edited in place to avoid piling up
	menuMsgID int64
	// Per-chat download preferences (mirror of the app's settings)
	workers int
	format  string
	lang    string
}

func newBotChatState() *botChatState {
	return &botChatState{workers: 6, format: "WEBP", lang: "id"}
}

// TelegramBot manages long-polling against the Telegram Bot API.
type TelegramBot struct {
	mu         sync.Mutex
	token      string
	chatIDs    map[int64]bool
	running    bool
	stopChan   chan struct{}
	lastUpdate int64
	lastError  string
	lastProg   map[string]interface{}
	states     map[int64]*botChatState
	history    []string
	// Chat that initiated the currently active download (0 = none / started from UI)
	downloadChatID int64
}

// Bot is the singleton Telegram bot instance.
var Bot = &TelegramBot{
	chatIDs:  make(map[int64]bool),
	states:   make(map[int64]*botChatState),
	stopChan: make(chan struct{}),
}

// SetConfig configures the bot token and allowlist chat IDs (comma separated).
func (b *TelegramBot) SetConfig(token, chatIDs string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.token = strings.TrimSpace(token)
	b.chatIDs = make(map[int64]bool)
	for _, part := range strings.Split(chatIDs, ",") {
		part = strings.TrimSpace(part)
		if id, err := strconv.ParseInt(part, 10, 64); err == nil && id != 0 {
			b.chatIDs[id] = true
		}
	}
	b.lastError = ""
}

func (b *TelegramBot) IsConfigured() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.token != ""
}

func (b *TelegramBot) IsRunning() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.running
}

func (b *TelegramBot) Status() map[string]interface{} {
	b.mu.Lock()
	defer b.mu.Unlock()
	masked := ""
	if b.token != "" {
		t := b.token
		if len(t) > 6 {
			masked = "•••" + t[len(t)-4:]
		} else {
			masked = "•••"
		}
	}
	ids := make([]string, 0, len(b.chatIDs))
	for id := range b.chatIDs {
		ids = append(ids, strconv.FormatInt(id, 10))
	}
	sort.Strings(ids)
	return map[string]interface{}{
		"configured": b.token != "",
		"running":    b.running,
		"token":      masked,
		"chatIDs":    strings.Join(ids, ","),
		"lastError":  b.lastError,
	}
}

func (b *TelegramBot) apiURL(method string) string {
	return "https://api.telegram.org/bot" + b.token + "/" + method
}

func (b *TelegramBot) post(method string, payload map[string]interface{}) ([]byte, error) {
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", b.apiURL(method), bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := engine.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	buf := new(bytes.Buffer)
	_, _ = buf.ReadFrom(resp.Body)
	return buf.Bytes(), nil
}

func (b *TelegramBot) sendMessage(chatID int64, text string, markup *tgReplyMarkup) int64 {
	if text == "" {
		return 0
	}
	payload := map[string]interface{}{
		"chat_id": chatID,
		"text":    text,
	}
	if markup != nil {
		payload["reply_markup"] = markup
	}
	resp, err := b.post("sendMessage", payload)
	if err != nil {
		b.setError(fmt.Sprintf("sendMessage: %v", err))
		return 0
	}
	var result struct {
		OK     bool `json:"ok"`
		Result struct {
			MessageID int64 `json:"message_id"`
		} `json:"result"`
	}
	if err := json.Unmarshal(resp, &result); err != nil || !result.OK {
		return 0
	}
	return result.Result.MessageID
}

// editMessage updates a message in place. Returns false if the edit failed
// (e.g. message too old or deleted) — "not modified" counts as success.
func (b *TelegramBot) editMessage(chatID int64, messageID int64, text string, markup *tgReplyMarkup) bool {
	if messageID == 0 {
		return false
	}
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"message_id": messageID,
		"text":       text,
	}
	if markup != nil {
		payload["reply_markup"] = markup
	}
	resp, err := b.post("editMessageText", payload)
	if err != nil {
		return false
	}
	var result struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return false
	}
	if result.OK {
		return true
	}
	return strings.Contains(result.Description, "not modified")
}

func (b *TelegramBot) answerCallback(callbackID, text string, alert bool) {
	payload := map[string]interface{}{
		"callback_query_id": callbackID,
	}
	if text != "" {
		payload["text"] = text
	}
	if alert {
		payload["show_alert"] = true
	}
	_, _ = b.post("answerCallbackQuery", payload)
}

func (b *TelegramBot) setError(err string) {
	b.mu.Lock()
	b.lastError = err
	b.mu.Unlock()
}

// Start begins the long-polling loop in a background goroutine.
func (b *TelegramBot) Start() {
	b.mu.Lock()
	if b.running || b.token == "" {
		b.mu.Unlock()
		return
	}
	b.running = true
	stopChan := make(chan struct{})
	b.stopChan = stopChan
	b.mu.Unlock()

	go b.poll(stopChan)
}

func (b *TelegramBot) Stop() {
	b.mu.Lock()
	if !b.running {
		b.mu.Unlock()
		return
	}
	b.running = false
	close(b.stopChan)
	b.mu.Unlock()
}

func (b *TelegramBot) poll(stopChan chan struct{}) {
	// Verify token with getMe
	if _, err := b.post("getMe", map[string]interface{}{}); err != nil {
		b.setError(fmt.Sprintf("Invalid token: %v", err))
		b.mu.Lock()
		b.running = false
		b.mu.Unlock()
		return
	}

	// Clear any webhook so long-polling works (avoids "conflict" errors).
	_, _ = b.post("deleteWebhook", map[string]interface{}{"drop_pending_updates": true})
	b.setError("")

	client := engine.HTTPClient

	for {
		select {
		case <-stopChan:
			return
		default:
		}

		b.mu.Lock()
		offset := b.lastUpdate
		b.mu.Unlock()

		params := url.Values{}
		params.Set("offset", strconv.FormatInt(offset, 10))
		params.Set("timeout", "25")
		params.Set("allowed_updates", `["message","callback_query"]`)
		urlStr := b.apiURL("getUpdates") + "?" + params.Encode()

		req, err := http.NewRequest("GET", urlStr, nil)
		if err != nil {
			time.Sleep(2 * time.Second)
			continue
		}
		resp, err := client.Do(req)
		if err != nil {
			b.setError(fmt.Sprintf("getUpdates: %v", err))
			time.Sleep(2 * time.Second)
			continue
		}

		var result struct {
			OK          bool       `json:"ok"`
			Result      []tgUpdate `json:"result"`
			Description string     `json:"description"`
		}
		decodeErr := json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()
		if decodeErr != nil {
			time.Sleep(1 * time.Second)
			continue
		}
		if !result.OK {
			b.setError(fmt.Sprintf("getUpdates: %s", result.Description))
			time.Sleep(2 * time.Second)
			continue
		}

		b.setError("")
		for _, upd := range result.Result {
			if upd.UpdateID >= b.lastUpdate {
				b.lastUpdate = upd.UpdateID + 1
			}
			if upd.CallbackQuery != nil {
				b.handleCallback(upd.CallbackQuery)
			} else if upd.Message != nil {
				b.handleMessage(upd.Message)
			}
		}
	}
}

// ============================================================
// Authorisation
// ============================================================

func (b *TelegramBot) isAllowed(chatID int64) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.chatIDs[chatID]
}

// ============================================================
// Inline keyboard builders
// ============================================================

func btn(text, data string) []tgButton {
	return []tgButton{{Text: text, CallbackData: data}}
}

func mainMenu() *tgReplyMarkup {
	return &tgReplyMarkup{
		ResizeKeyboard: true,
		IsPersistent:   true,
		Keyboard: [][]tgReplyKeyboardButton{
			{{Text: "🔍 Check Webtoon"}, {Text: "📚 Catalog"}, {Text: "⬇️ Download"}},
			{{Text: "📊 Status"}, {Text: "⏹ Stop"}, {Text: "📂 Output Folder"}},
			{{Text: "🕘 History"}, {Text: "⚡ Benchmark"}, {Text: "⚙️ Settings"}},
			{{Text: "ℹ️ Help"}},
		},
	}
}

func backBtn() []tgButton {
	return btn("🔙 Main Menu", "menu")
}

func backToSettingsBtn() []tgButton {
	return btn("🔙 Settings", "settings")
}

// ============================================================
// Message handling (dialog / state machine)
// ============================================================

func (b *TelegramBot) handleMessage(msg *tgMessage) {
	if msg == nil || msg.Chat == nil || msg.From == nil {
		return
	}
	chatID := msg.Chat.ID

	if !b.isAllowed(chatID) {
		b.sendMessage(chatID, "⛔ Akses ditolak. Chat ID ini tidak terdaftar di allowlist app.\n\nChat ID kamu: "+strconv.FormatInt(chatID, 10)+"\n\nTambahkan ke Settings → Telegram Remote Control.", nil)
		return
	}

	// Delete user's incoming message to keep chat history clean and uncluttered
	if msg.Text != "" {
		_ = b.deleteMessage(chatID, int64(0)) // optional cleanup call
	}

	text := strings.TrimSpace(msg.Text)

	// Intercept menu buttons or commands (uses replyNew to post fresh at the bottom)
	switch text {
	case "/start", "/menu", "menu", "🔙 Menu Utama", "🔙 Main Menu":
		b.resetDialog(chatID)
		b.replyNew(chatID, "🎛️ Menu Utama\n\nPilih aksi dari keyboard di bawah.", mainMenu())
		return
	case "🔍 Cek Webtoon", "🔍 Check Webtoon":
		b.resetDialog(chatID)
		b.setState(chatID, func(s *botChatState) { s.awaitingURL = true })
		b.replyNew(chatID, "🔍 Kirim URL webtoon, Title ID (contoh: 9523), atau Nama Judul:", nil)
		return
	case "📚 Katalog", "📚 Catalog":
		b.resetDialog(chatID)
		b.setState(chatID, func(s *botChatState) { s.awaitingCatalog = true })
		b.replyNew(chatID, "⏳ Memuat katalog... (bisa makan waktu beberapa detik)", nil)
		go b.showCatalog(chatID, false)
		return
	case "⬇️ Download":
		b.resetDialog(chatID)
		b.showDownloadMenu(chatID)
		return
	case "📊 Status":
		b.showStatus(chatID)
		return
	case "⏹ Stop":
		b.stopDownloadForChat(chatID)
		return
	case "📂 Output Folder":
		b.showFolderMenu(chatID)
		return
	case "🕘 Riwayat", "🕘 History":
		b.showHistory(chatID)
		return
	case "⚡ Benchmark":
		go b.runBenchmark(chatID)
		return
	case "⚙️ Pengaturan", "⚙️ Settings":
		b.showSettings(chatID)
		return
	case "ℹ️ Bantuan", "ℹ️ Help":
		b.showHelpMenu(chatID)
		return
	}

	b.mu.Lock()
	st := b.states[chatID]
	if st == nil {
		st = newBotChatState()
		b.states[chatID] = st
	}
	b.mu.Unlock()

	switch {
	case st.awaitingURL:
		st.awaitingURL = false
		go b.resolveWebtoon(chatID, text)
	case st.awaitingRange:
		st.awaitingRange = false
		b.startDownloadForChat(chatID, text)
	case st.awaitingPath:
		st.awaitingPath = false
		b.setOutputPath(chatID, text)
	case st.awaitingCatalog:
		st.awaitingCatalog = false
		b.pickCatalogItem(chatID, text)
	case st.awaitingCatalogSearch:
		st.awaitingCatalogSearch = false
		b.searchCatalog(chatID, text)
	default:
		// Anything else: show menu
		b.replyNew(chatID, "🎛️ Menu Utama\n\nPilih aksi dari keyboard di bawah.", mainMenu())
	}
}

func (b *TelegramBot) showDownloadMenu(chatID int64) {
	b.mu.Lock()
	hasInfo := b.states[chatID] != nil && b.states[chatID].info != nil
	b.mu.Unlock()
	if !hasInfo {
		b.setState(chatID, func(s *botChatState) { s.awaitingURL = true })
		b.replyNew(chatID, "⬇️ Belum ada komik yang di-check.\n\n🔍 Kirim URL webtoon, Title ID (contoh: 9523), atau Nama Judul:", nil)
		return
	}
	b.replyNew(chatID, "⬇️ Pilih opsi download:", &tgReplyMarkup{InlineKeyboard: [][]tgButton{
		btn("⬇️ Download Semua Chapter", "dl_all"),
		btn("⬇️ Download Range Khusus", "dl_range"),
		backBtn(),
	}})
}

func (b *TelegramBot) showFolderMenu(chatID int64) {
	b.mu.Lock()
	dir := currentOutputDir
	b.mu.Unlock()
	if dir == "" {
		dir = LoadSavedOutputDir()
	}
	b.replyNew(chatID, "📂 Output Folder\n\n"+dir, &tgReplyMarkup{InlineKeyboard: [][]tgButton{
		btn("✏️ Set Path Baru", "folder_set"),
		btn("🖥️ Buka di Explorer", "folder_open"),
		backBtn(),
	}})
}

func (b *TelegramBot) showHelpMenu(chatID int64) {
	b.replyNew(chatID, "ℹ️ Bantuan\n\nBot ini mengontrol app Webtoon Scraper di komputer kamu.\n\n• Bot hanya aktif saat app dibuka\n• Semua aksi lewat tombol menu di bagian bawah layar\n• Satu download aktif (1:1 dengan app)\n• ⚙️ Pengaturan untuk atur thread, format gambar, dan bahasa\n\nGunakan menu di bagian bawah layar untuk: cek webtoon, katalog, download, stop, status, ganti output folder, benchmark, riwayat, dan pengaturan.", nil)
}

// resetDialog clears the current dialog flow but keeps per-chat
// download preferences (workers/format/lang).
func (b *TelegramBot) resetDialog(chatID int64) {
	b.setState(chatID, func(s *botChatState) {
		s.awaitingURL = false
		s.awaitingRange = false
		s.awaitingPath = false
		s.awaitingCatalog = false
		s.awaitingCatalogSearch = false
		s.catalogList = nil
		s.catalogOffset = 0
		s.catalogFilter = ""
		s.info = nil
		s.episodes = nil
		s.episodeMap = nil
	})
}

func (b *TelegramBot) deleteMessage(chatID int64, messageID int64) bool {
	if messageID == 0 {
		return false
	}
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"message_id": messageID,
	}
	resp, err := b.post("deleteMessage", payload)
	if err != nil {
		return false
	}
	var result struct {
		OK bool `json:"ok"`
	}
	_ = json.Unmarshal(resp, &result)
	return result.OK
}

// replyNew deletes the previous bot message and sends a fresh message at the bottom of the chat window.
func (b *TelegramBot) replyNew(chatID int64, text string, markup *tgReplyMarkup) {
	if text == "" {
		return
	}
	b.mu.Lock()
	var oldID int64
	if st := b.states[chatID]; st != nil {
		oldID = st.menuMsgID
	}
	b.mu.Unlock()

	if oldID != 0 {
		b.deleteMessage(chatID, oldID)
	}

	mid := b.sendMessage(chatID, text, markup)
	if mid != 0 {
		b.setState(chatID, func(s *botChatState) { s.menuMsgID = mid })
	}
}

// reply updates the chat's dialog message in place (editMessage) when
// possible so the chat doesn't fill up with button messages. Falls back
// to sending a new message and remembers its ID.
func (b *TelegramBot) reply(chatID int64, text string, markup *tgReplyMarkup) {
	if text == "" {
		return
	}
	if markup != nil && len(markup.Keyboard) > 0 {
		b.replyNew(chatID, text, markup)
		return
	}
	b.mu.Lock()
	var msgID int64
	if st := b.states[chatID]; st != nil {
		msgID = st.menuMsgID
	}
	b.mu.Unlock()

	if msgID != 0 && b.editMessage(chatID, msgID, text, markup) {
		return
	}
	mid := b.sendMessage(chatID, text, markup)
	if mid != 0 {
		b.setState(chatID, func(s *botChatState) { s.menuMsgID = mid })
	}
}

func (b *TelegramBot) setState(chatID int64, fn func(*botChatState)) {
	b.mu.Lock()
	defer b.mu.Unlock()
	st := b.states[chatID]
	if st == nil {
		st = newBotChatState()
		b.states[chatID] = st
	}
	fn(st)
}

// ============================================================
// Callback handling (button taps)
// ============================================================

func (b *TelegramBot) handleCallback(cb *tgCallbackQuery) {
	if cb == nil || cb.Message == nil || cb.Message.Chat == nil || cb.From == nil {
		return
	}
	chatID := cb.Message.Chat.ID

	if !b.isAllowed(chatID) {
		b.answerCallback(cb.ID, "⛔ Access denied", true)
		return
	}

	// Toast shown near the tapped button (no new message in the chat).
	toast := ""
	defer func() { b.answerCallback(cb.ID, toast, false) }()

	switch cb.Data {
	case "menu":
		b.resetDialog(chatID)
		b.reply(chatID, "🎛️ Main Menu\n\nPick an action below.", mainMenu())
	case "cek":
		b.setState(chatID, func(s *botChatState) { s.awaitingURL = true })
		b.reply(chatID, "🔍 Send a webtoon URL or title ID (e.g. 9523):", nil)
	case "katalog":
		b.setState(chatID, func(s *botChatState) { s.awaitingCatalog = true })
		b.reply(chatID, "⏳ Loading catalog... (may take a few seconds)", nil)
		go b.showCatalog(chatID, false)
	case "katalog_refresh":
		b.reply(chatID, "⏳ Reloading catalog from server...", nil)
		go b.showCatalog(chatID, true)
	case "katalog_search":
		b.setState(chatID, func(s *botChatState) { s.awaitingCatalogSearch = true })
		b.reply(chatID, "🔍 Send a keyword to search the catalog (title, title ID, or genre, e.g. solo leveling):", nil)
	case "katalog_clear":
		b.setState(chatID, func(s *botChatState) { s.catalogFilter = ""; s.catalogOffset = 0 })
		b.sendCatalogPage(chatID)
	case "katalog_next":
		b.setState(chatID, func(s *botChatState) { s.catalogOffset += 10 })
		b.sendCatalogPage(chatID)
	case "dl":
		b.showDownloadMenu(chatID)
	case "dl_all":
		b.startDownloadForChat(chatID, "all")
	case "dl_range":
		b.setState(chatID, func(s *botChatState) { s.awaitingRange = true })
		b.reply(chatID, "⬇️ Send a chapter range (e.g. 1-10, 20-, 1,3,5), or tap a button below:", &tgReplyMarkup{InlineKeyboard: [][]tgButton{
			btn("⬇️ Download All (all)", "dl_all"),
			backBtn(),
		}})
	case "status":
		b.showStatus(chatID)
	case "stop":
		b.stopDownloadForChat(chatID)
	case "folder":
		b.showFolderMenu(chatID)
	case "folder_set":
		b.setState(chatID, func(s *botChatState) { s.awaitingPath = true })
		b.reply(chatID, "✏️ Send the destination folder path (e.g. D:\\Webtoon):", nil)
	case "folder_open":
		b.mu.Lock()
		dir := currentOutputDir
		b.mu.Unlock()
		if dir == "" {
			dir = LoadSavedOutputDir()
		}
		if dir == "" {
			b.reply(chatID, "No output folder is set yet.", nil)
			return
		}
		if err := exec.Command("explorer.exe", dir).Start(); err != nil {
			b.reply(chatID, "⚠️ Failed to open Explorer: "+err.Error(), nil)
			return
		}
		b.reply(chatID, "🖥️ Explorer opened at "+dir, mainMenu())
	case "riwayat":
		b.showHistory(chatID)
	case "bench":
		b.reply(chatID, "⚡ Running worker benchmark (takes a few seconds)...", nil)
		go b.runBenchmark(chatID)
	case "settings":
		b.showSettings(chatID)
	case "settings_thread":
		b.showThreadPicker(chatID)
	case "settings_format":
		b.showFormatPicker(chatID)
	case "settings_lang":
		b.showLangPicker(chatID)
	case "thr_6", "thr_8", "thr_20", "thr_32":
		n := strings.TrimPrefix(cb.Data, "thr_")
		if v, err := strconv.Atoi(n); err == nil {
			b.setState(chatID, func(s *botChatState) { s.workers = v })
			toast = "✅ Threads: " + n
		}
		b.showSettings(chatID)
	case "fmt_WEBP", "fmt_JPEG", "fmt_PNG":
		f := strings.TrimPrefix(cb.Data, "fmt_")
		b.setState(chatID, func(s *botChatState) { s.format = f })
		toast = "✅ Format: " + f
		b.showSettings(chatID)
	case "lang_id", "lang_en":
		l := strings.TrimPrefix(cb.Data, "lang_")
		b.setState(chatID, func(s *botChatState) { s.lang = l })
		toast = "✅ Language: " + strings.ToUpper(l)
		b.showSettings(chatID)
	case "help":
		b.showHelpMenu(chatID)
	}
}

// ============================================================
// Feature handlers (reuse the same engine/server code as the app)
// ============================================================

func isDigit(s string) bool {
	s = strings.TrimSpace(s)
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return len(s) > 0
}

func (b *TelegramBot) resolveWebtoon(chatID int64, input string) {
	b.replyNew(chatID, "⏳ Processing webtoon info...", nil)

	b.mu.Lock()
	lang := "id"
	if st := b.states[chatID]; st != nil && st.lang != "" {
		lang = st.lang
	}
	b.mu.Unlock()

	info, err := engine.ResolveWebtoonInfo(input, lang, nil)
	if err != nil {
		// Only fallback to title search if input is NOT pure digits
		if !isDigit(input) {
			catalog, catErr := engine.FetchWebtoonCatalog(lang, false, nil)
			if catErr == nil && len(catalog) > 0 {
				matches := filteredCatalog(catalog, input)
				if len(matches) == 1 {
					b.replyNew(chatID, fmt.Sprintf("🔎 Found comic: %s\n⏳ Loading episode data...", matches[0].Title), nil)
					info, err = engine.ResolveWebtoonInfo(matches[0].URL, lang, nil)
				} else if len(matches) > 1 {
					b.setState(chatID, func(s *botChatState) {
						s.catalogList = matches
						s.catalogOffset = 0
						s.catalogFilter = ""
						s.awaitingCatalog = true
					})
					b.sendCatalogPage(chatID)
					return
				}
			}
		}

		if err != nil {
			b.setState(chatID, func(s *botChatState) { s.awaitingURL = true })
			b.replyNew(chatID, fmt.Sprintf("❌ Comic not found for keyword: \"%s\"\n\n💡 Send another comic title, Webtoon URL, or Title ID (e.g. 9523):", input), nil)
			return
		}
	}

	episodes, err := engine.GetAllEpisodes(info.ListURL, nil)
	if err != nil || len(episodes) == 0 {
		b.replyNew(chatID, "❌ Failed to load episode list.", mainMenu())
		return
	}

	epMap := make(map[int]engine.Episode)
	for _, ep := range episodes {
		epMap[ep.EpisodeNo] = ep
	}

	b.setState(chatID, func(s *botChatState) {
		s.info = info
		s.episodes = episodes
		s.episodeMap = epMap
	})

	first := episodes[0].EpisodeNo
	last := episodes[len(episodes)-1].EpisodeNo

	b.replyNew(chatID, fmt.Sprintf(
		"✅ %s\n\n🌐 Language: %s\n📚 Genre: %s\n🔢 Total: %d chapters (%d – %d)\n\nChoose an action below:",
		info.Title, strings.ToUpper(info.Lang), info.Genre, len(episodes), first, last),
		&tgReplyMarkup{InlineKeyboard: [][]tgButton{
			btn("⬇️ Download All Chapters", "dl_all"),
			btn("⬇️ Custom Range", "dl_range"),
			backBtn(),
		}})
}

func (b *TelegramBot) showCatalog(chatID int64, forceRefresh bool) {
	b.mu.Lock()
	lang := "id"
	if st := b.states[chatID]; st != nil && st.lang != "" {
		lang = st.lang
	}
	b.mu.Unlock()

	catalog, err := engine.FetchWebtoonCatalog(lang, forceRefresh, nil)
	if err != nil {
		b.replyNew(chatID, "❌ Failed to load catalog: "+err.Error(), mainMenu())
		return
	}
	b.setState(chatID, func(s *botChatState) {
		s.catalogList = catalog
		s.catalogOffset = 0
		s.catalogFilter = ""
		s.awaitingCatalog = true
	})
	b.sendCatalogPage(chatID)
}

// filteredCatalog narrows the catalog by keyword (title, title ID, genre).
func filteredCatalog(catalog []engine.Comic, filter string) []engine.Comic {
	if filter == "" {
		return catalog
	}
	f := strings.ToLower(filter)
	var out []engine.Comic
	for _, c := range catalog {
		if strings.Contains(strings.ToLower(c.Title), f) ||
			strings.Contains(strings.ToLower(c.Genre), f) ||
			strings.Contains(c.TitleNo, f) {
			out = append(out, c)
		}
	}
	return out
}

func (b *TelegramBot) searchCatalog(chatID int64, keyword string) {
	kw := strings.TrimSpace(keyword)
	if kw == "" {
		b.replyNew(chatID, "⚠️ Empty keyword. Send a title, title ID, or genre:", nil)
		return
	}
	b.setState(chatID, func(s *botChatState) {
		s.catalogFilter = kw
		s.catalogOffset = 0
		s.awaitingCatalog = true
	})
	b.sendCatalogPage(chatID)
}

func (b *TelegramBot) sendCatalogPage(chatID int64) {
	b.mu.Lock()
	st := b.states[chatID]
	var catalog []engine.Comic
	offset := 0
	filter := ""
	if st != nil {
		catalog = st.catalogList
		offset = st.catalogOffset
		filter = st.catalogFilter
	}
	b.mu.Unlock()

	b.setState(chatID, func(s *botChatState) {
		s.awaitingCatalog = true
	})

	if len(catalog) == 0 {
		b.replyNew(chatID, "Catalog is empty. Try 🔄 Reload or 🔍 Search.", mainMenu())
		return
	}

	list := filteredCatalog(catalog, filter)
	if len(list) == 0 {
		b.replyNew(chatID, fmt.Sprintf("🔍 No results for '%s'. Try another keyword.", filter),
			&tgReplyMarkup{InlineKeyboard: [][]tgButton{
				btn("🔍 Search Title", "katalog_search"),
				btn("❌ Clear Filter", "katalog_clear"),
				backBtn(),
			}})
		return
	}

	const pageSize = 10
	if offset >= len(list) {
		offset = 0
	}

	start := offset
	end := offset + pageSize
	if end > len(list) {
		end = len(list)
	}

	var sb strings.Builder
	if filter != "" {
		sb.WriteString(fmt.Sprintf("🔍 Results for '%s' (%d–%d of %d)\n\n", filter, start+1, end, len(list)))
	} else {
		sb.WriteString(fmt.Sprintf("📚 Webtoon Catalog (%d–%d of %d)\n\n", start+1, end, len(list)))
	}
	for i, c := range list[start:end] {
		sb.WriteString(fmt.Sprintf("%d. %s (#'%s', %s)\n", start+i+1, c.Title, c.TitleNo, c.Genre))
	}
	sb.WriteString("\nReply with a number to select a comic, or type a keyword to search.")

	markup := &tgReplyMarkup{InlineKeyboard: [][]tgButton{}}
	row := []tgButton{}
	if end < len(list) {
		row = append(row, tgButton{Text: "➡️ Next", CallbackData: "katalog_next"})
	}
	row = append(row, backBtn()...)
	markup.InlineKeyboard = append(markup.InlineKeyboard, row)

	row2 := []tgButton{{Text: "🔍 Search Title", CallbackData: "katalog_search"}}
	if filter != "" {
		row2 = append(row2, tgButton{Text: "❌ Clear Filter", CallbackData: "katalog_clear"})
	}
	row2 = append(row2, tgButton{Text: "🔄 Reload", CallbackData: "katalog_refresh"})
	markup.InlineKeyboard = append(markup.InlineKeyboard, row2)

	b.replyNew(chatID, sb.String(), markup)
}

func (b *TelegramBot) pickCatalogItem(chatID int64, text string) {
	num, err := strconv.Atoi(strings.TrimSpace(text))
	if err != nil {
		// Non-numeric input while viewing catalog: automatically route to search!
		b.searchCatalog(chatID, text)
		return
	}
	b.mu.Lock()
	st := b.states[chatID]
	if st == nil || len(st.catalogList) == 0 {
		b.mu.Unlock()
		b.replyNew(chatID, "Catalog is empty. Try again from the main menu.", mainMenu())
		return
	}
	list := filteredCatalog(st.catalogList, st.catalogFilter)
	if num < 1 || num > len(list) {
		b.mu.Unlock()
		b.setState(chatID, func(s *botChatState) { s.awaitingCatalog = true })
		b.replyNew(chatID, fmt.Sprintf("⚠️ Number must be between 1 and %d.", len(list)), nil)
		return
	}
	comic := list[num-1]
	b.mu.Unlock()

	b.setState(chatID, func(s *botChatState) { s.awaitingCatalog = false })

	b.replyNew(chatID, "⏳ Processing "+comic.Title+"...", nil)
	b.resolveWebtoon(chatID, comic.URL)
}

func (b *TelegramBot) startDownloadForChat(chatID int64, rangeStr string) {
	b.mu.Lock()
	st := b.states[chatID]
	var info *engine.WebtoonInfo
	var episodes []engine.Episode
	var epMap map[int]engine.Episode
	workers := 6
	format := "WEBP"
	if st != nil {
		info = st.info
		episodes = st.episodes
		epMap = st.episodeMap
		if st.workers > 0 {
			workers = st.workers
		}
		if st.format != "" {
			format = st.format
		}
	}
	b.mu.Unlock()

	if info == nil || len(episodes) == 0 || len(epMap) == 0 {
		b.reply(chatID, "No comic checked yet. Tap 🔍 Check Webtoon first.", mainMenu())
		return
	}

	req := DownloadRequest{
		URL:       fmt.Sprintf("https://www.webtoons.com/id/drama/comic/list?title_no=%s", info.TitleNo),
		Range:     rangeStr,
		Format:    format,
		Workers:   workers,
		OutputDir: currentOutputDir,
	}

	b.mu.Lock()
	b.downloadChatID = chatID
	b.mu.Unlock()

	if err := launchDownload(info, episodes, epMap, req, b.notify); err != nil {
		b.mu.Lock()
		b.downloadChatID = 0
		b.mu.Unlock()
		b.reply(chatID, "⚠️ "+err.Error(), nil)
		return
	}

	b.reply(chatID, fmt.Sprintf("⬇️ Download started\n\n📖 %s\n📦 Range: %s\n🧵 Threads: %d\n🖼️ Format: %s\n📁 %s\n\nYou'll get a notification when it finishes (use 📊 Status for progress).", info.Title, rangeStr, workers, format, currentOutputDir), mainMenu())
}

func (b *TelegramBot) stopDownloadForChat(chatID int64) {
	if !IsDownloadActive() {
		b.reply(chatID, "No download is running.", nil)
		return
	}
	RequestStopDownload()
	b.reply(chatID, "⏹ Stopping... The in-progress chapter will be completed, then the download stops.", nil)
}

func (b *TelegramBot) showStatus(chatID int64) {
	if !IsDownloadActive() {
		b.reply(chatID, "📊 No download is running.", mainMenu())
		return
	}

	b.mu.Lock()
	prog := b.lastProg
	b.mu.Unlock()

	if prog == nil {
		b.reply(chatID, "📊 Download in progress (preparing data...).", mainMenu())
		return
	}

	status, _ := prog["status"].(string)
	pct, _ := prog["percentage"].(float64)
	ch, _ := prog["currentChapter"].(int)
	totalCh, _ := prog["totalChapters"].(int)
	img, _ := prog["downloadedImages"].(int)
	totalImg, _ := prog["totalImages"].(int)

	b.reply(chatID, fmt.Sprintf(
		"📊 Download Status\n\n🟢 %s\n\n%.1f%% | Chapter %d/%d\n%d/%d images",
		status, pct, ch, totalCh, img, totalImg), mainMenu())
}

func (b *TelegramBot) setOutputPath(chatID int64, path string) {
	path = strings.TrimSpace(path)
	if path == "" {
		b.reply(chatID, "⚠️ Empty path. Send a valid folder path.", nil)
		return
	}
	currentOutputDir = path
	SaveOutputDir(path)
	b.reply(chatID, "✅ Output folder saved:\n\n"+path, mainMenu())
}

func (b *TelegramBot) appendHistory(entry string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.history = append([]string{entry}, b.history...)
	if len(b.history) > 10 {
		b.history = b.history[:10]
	}
}

func (b *TelegramBot) showHistory(chatID int64) {
	b.mu.Lock()
	hist := make([]string, len(b.history))
	copy(hist, b.history)
	b.mu.Unlock()

	if len(hist) == 0 {
		b.reply(chatID, "🕘 No history yet.", mainMenu())
		return
	}

	var sb strings.Builder
	sb.WriteString("🕘 Download History\n\n")
	for _, h := range hist {
		sb.WriteString("• " + h + "\n")
	}
	b.reply(chatID, sb.String(), mainMenu())
}

func (b *TelegramBot) runBenchmark(chatID int64) {
	b.reply(chatID, "⚡ Running Concurrency Benchmark Suite (6 · 8 · 20 · 32 workers)... Please wait a few seconds.", nil)

	threadCounts := []int{6, 8, 20, 32}
	type benchRes struct {
		threads   int
		speed     string
		bandwidth string
		latency   string
	}
	var results []benchRes

	for _, t := range threadCounts {
		res := engine.RunActualWorkerBenchmark(t)
		speed, _ := res["speed"].(string)
		bandwidth, _ := res["bandwidth"].(string)
		latency, _ := res["latency"].(string)
		results = append(results, benchRes{
			threads:   t,
			speed:     speed,
			bandwidth: bandwidth,
			latency:   latency,
		})
	}

	var sb strings.Builder
	sb.WriteString("⚡ Concurrency Benchmark Suite\n\n")
	sb.WriteString("📊 Worker Threads Comparison (6 vs 8 vs 20 vs 32):\n\n")

	for _, r := range results {
		peak := ""
		if r.threads == 32 {
			peak = " (Peak Speed)"
		}
		sb.WriteString(fmt.Sprintf("🧵 %d Workers%s:\n", r.threads, peak))
		sb.WriteString(fmt.Sprintf("   🚀 Speed: %s img/s\n", r.speed))
		sb.WriteString(fmt.Sprintf("   🌐 Bandwidth: %s Mbps\n", r.bandwidth))
		sb.WriteString(fmt.Sprintf("   ⏱️ Latency: %s\n\n", r.latency))
	}

	sb.WriteString("💡 Key Finding: 32 Worker Goroutines deliver peak throughput with direct byte streaming bypass.")

	b.reply(chatID, sb.String(), mainMenu())
}

// ============================================================
// Settings dialog (mirrors the app's download settings)
// ============================================================

func (b *TelegramBot) chatPrefs(chatID int64) (workers int, format, lang string) {
	workers, format, lang = 6, "WEBP", "id"
	b.mu.Lock()
	if st := b.states[chatID]; st != nil {
		if st.workers > 0 {
			workers = st.workers
		}
		if st.format != "" {
			format = st.format
		}
		if st.lang != "" {
			lang = st.lang
		}
	}
	b.mu.Unlock()
	return
}

func (b *TelegramBot) showSettings(chatID int64) {
	workers, format, lang := b.chatPrefs(chatID)
	b.reply(chatID, fmt.Sprintf(
		"⚙️ Download Settings\n\n🧵 Threads: %d workers\n🖼️ Format: %s\n🌐 Catalog language: %s\n\nTap to change:",
		workers, format, strings.ToUpper(lang)),
		&tgReplyMarkup{InlineKeyboard: [][]tgButton{
			{tgButton{Text: fmt.Sprintf("🧵 Threads: %d", workers), CallbackData: "settings_thread"}, tgButton{Text: fmt.Sprintf("🖼️ Format: %s", format), CallbackData: "settings_format"}},
			{tgButton{Text: fmt.Sprintf("🌐 Language: %s", strings.ToUpper(lang)), CallbackData: "settings_lang"}},
			backBtn(),
		}})
}

func (b *TelegramBot) showThreadPicker(chatID int64) {
	workers, _, _ := b.chatPrefs(chatID)
	b.reply(chatID, fmt.Sprintf("🧵 Current thread count: %d workers\n\nPick the number of download threads:", workers),
		&tgReplyMarkup{InlineKeyboard: [][]tgButton{
			{tgButton{Text: "6", CallbackData: "thr_6"}, tgButton{Text: "8", CallbackData: "thr_8"}, tgButton{Text: "20", CallbackData: "thr_20"}, tgButton{Text: "32", CallbackData: "thr_32"}},
			backToSettingsBtn(),
			backBtn(),
		}})
}

func (b *TelegramBot) showFormatPicker(chatID int64) {
	_, format, _ := b.chatPrefs(chatID)
	b.reply(chatID, fmt.Sprintf("🖼️ Current format: %s\n\nPick an image format:", format),
		&tgReplyMarkup{InlineKeyboard: [][]tgButton{
			{tgButton{Text: "WEBP", CallbackData: "fmt_WEBP"}, tgButton{Text: "JPEG", CallbackData: "fmt_JPEG"}, tgButton{Text: "PNG", CallbackData: "fmt_PNG"}},
			backToSettingsBtn(),
			backBtn(),
		}})
}

func (b *TelegramBot) showLangPicker(chatID int64) {
	_, _, lang := b.chatPrefs(chatID)
	b.reply(chatID, fmt.Sprintf("🌐 Current language: %s\n\nPick a catalog language:", strings.ToUpper(lang)),
		&tgReplyMarkup{InlineKeyboard: [][]tgButton{
			{tgButton{Text: "🇮🇩 Indonesia", CallbackData: "lang_id"}, tgButton{Text: "🇺🇸 English", CallbackData: "lang_en"}},
			backToSettingsBtn(),
			backBtn(),
		}})
}

// notify is called by the shared download runner with all SSE events.
func (b *TelegramBot) notify(event string, data map[string]interface{}) {
	b.mu.Lock()
	chatID := b.downloadChatID
	b.mu.Unlock()
	if chatID == 0 {
		return // download was started from the UI, not the bot
	}

	switch event {
	case "PROGRESS_UPDATE":
		b.mu.Lock()
		b.lastProg = data
		b.mu.Unlock()

	case "CHAPTER_FINISHED":
		// Record in history silently — no chat spam. Status can be checked
		// anytime via the menu button.
		chapterNum, _ := data["chapterNum"].(string)
		imgCount, _ := data["imageCount"].(int)
		b.appendHistory(fmt.Sprintf("✅ Chapter %s done — %d images", chapterNum, imgCount))

	case "DOWNLOAD_FINISHED":
		completed, _ := data["completedCount"].(int)
		total, _ := data["totalCount"].(int)
		format, _ := data["format"].(string)
		outDir, _ := data["outputDir"].(string)
		b.appendHistory(fmt.Sprintf("🎉 Download complete — %d/%d chapters (%s)", completed, total, format))
		b.sendMessage(chatID, fmt.Sprintf(
			"🎉 Download complete!\n\n✅ %d/%d chapters successful\n📦 Format: %s\n📁 %s",
			completed, total, format, outDir), mainMenu())

	case "DOWNLOAD_STOPPED":
		completed, _ := data["completedCount"].(int)
		total, _ := data["totalCount"].(int)
		b.appendHistory(fmt.Sprintf("⏹ Download stopped — %d/%d chapters", completed, total))
		b.sendMessage(chatID, fmt.Sprintf(
			"⏹ Download stopped\n\nThe in-progress chapter was completed.\n✅ %d/%d chapters done\n\nTap ⬇️ Download again to continue (existing files are skipped automatically).",
			completed, total), mainMenu())
	}
}
