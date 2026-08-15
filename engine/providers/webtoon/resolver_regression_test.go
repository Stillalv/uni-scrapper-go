package webtoon

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGetAllWebtoonEpisodesReportsFailedPaginationPage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("page") == "2" {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		fmt.Fprint(w, `<html><body><ul id="_listUl">
<li><a href="/id/episode/viewer?episode_no=1"><span class="subj">One</span></a></li>
<li><a href="/id/episode/viewer?episode_no=3"><span class="subj">Three</span></a></li>
</ul><div class="paginate"><a href="?page=2">2</a></div></body></html>`)
	}))
	defer server.Close()

	_, err := GetAllWebtoonEpisodes(server.URL+"/id/list", nil)
	if err == nil || !strings.Contains(err.Error(), "failed to fetch Webtoon episode pages") {
		t.Fatalf("expected pagination error, got %v", err)
	}
}
