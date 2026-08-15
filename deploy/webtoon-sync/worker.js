const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json; charset=utf-8",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return json({ ok: true, service: "webtoon-sync" });
      }

      if (!url.pathname.startsWith("/v1/")) {
        return json({ error: "Not found" }, 404);
      }
      authenticate(request, env);

      const userId = env.SYNC_USER_ID || "default";
      const path = url.pathname.replace(/\/$/, "");
      const includeDeleted = url.searchParams.get("include_deleted") === "true";

      if ((path === "/v1/devices/register" || path === "/v1/device/register") && request.method === "POST") {
        return await registerDevice(request, env.DB, userId);
      }
      if (path === "/v1/bootstrap" && (request.method === "GET" || request.method === "POST")) {
        return await bootstrap(request, env.DB, userId, includeDeleted);
      }

      const syncMatch = path.match(/^\/v1\/(bookmarks|history)\/sync$/);
      if (syncMatch && request.method === "POST") {
        return await syncCollection(request, env.DB, userId, syncMatch[1], includeDeleted);
      }

      const match = path.match(/^\/v1\/(bookmarks|history)(?:\/([^/]+))?$/);
      if (match) {
        const kind = match[1];
        const id = match[2] ? decodeURIComponent(match[2]) : null;
        return await handleCollection(request, env.DB, userId, kind, id, includeDeleted);
      }

      if (path === "/v1/settings" && request.method === "GET") {
        return await listSettings(env.DB, userId);
      }
      if (path === "/v1/settings/sync" && request.method === "POST") {
        return await syncSettings(request, env.DB, userId);
      }
      const settingMatch = path.match(/^\/v1\/settings(?:\/([^/]+))?$/);
      if (settingMatch && (request.method === "POST" || request.method === "PUT")) {
        const key = settingMatch[1] ? decodeURIComponent(settingMatch[1]) : null;
        return await upsertSetting(request, env.DB, userId, key);
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      if (error instanceof ApiError) {
        return json({ error: error.message }, error.status);
      }
      console.error(error);
      return json({ error: "Internal server error" }, 500);
    }
  },
};

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function authenticate(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!env.SYNC_API_TOKEN || !match || match[1] !== env.SYNC_API_TOKEN) {
    throw new ApiError(401, "Unauthorized");
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function readJson(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      throw new Error("JSON object or array required");
    }
    return body;
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}

function now() {
  return new Date().toISOString();
}

function timestamp(value) {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return now();
}

function text(value) {
  return value === undefined || value === null ? null : String(value);
}

function number(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function jsonText(value, fallback = {}) {
  try {
    return JSON.stringify(value === undefined ? fallback : value);
  } catch {
    throw new ApiError(400, "Payload contains values that cannot be serialized");
  }
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function idFor(record, kind) {
  const value = kind === "bookmarks"
    ? (record.bookmark_id ?? record.id ?? record.url)
    : (record.history_id ?? record.id ?? record.download_id);
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new ApiError(400, `${kind === "bookmarks" ? "bookmark_id" : "history_id"} is required`);
  }
  return String(value);
}

function recordsFromBody(body, name) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.records)) return body.records;
  if (Array.isArray(body[name])) return body[name];
  return [body];
}

function recordResponse(row, kind) {
  const result = parseJson(row.payload_json, {});
  const idName = kind === "bookmarks" ? "bookmark_id" : "history_id";
  result[idName] = row[idName];
  result.device_id = row.device_id;
  result.created_at = row.created_at;
  result.updated_at = row.updated_at;
  result.deleted = Boolean(row.is_deleted);
  result.is_deleted = Boolean(row.is_deleted);
  return result;
}

function settingResponse(row) {
  const result = parseJson(row.payload_json, {});
  result.key = row.key;
  result.value = parseJson(row.value_json, row.value_json);
  result.device_id = row.device_id;
  result.created_at = row.created_at;
  result.updated_at = row.updated_at;
  return result;
}

async function registerDevice(request, db, userId) {
  const body = await readJson(request);
  const deviceId = text(body.device_id ?? body.id);
  if (!deviceId) throw new ApiError(400, "device_id is required");
  const current = now();
  const metadata = body.metadata ?? body.metadata_json ?? {};
  await db.prepare(`
    INSERT INTO devices (user_id, device_id, name, platform, metadata_json, created_at, updated_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, device_id) DO UPDATE SET
      name = excluded.name,
      platform = excluded.platform,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at,
      last_seen_at = excluded.last_seen_at
  `).bind(userId, deviceId, text(body.name), text(body.platform), jsonText(metadata), current, current, current).run();

  const row = await db.prepare(`
    SELECT device_id, name, platform, metadata_json, created_at, updated_at, last_seen_at
    FROM devices WHERE user_id = ? AND device_id = ?
  `).bind(userId, deviceId).first();
  return json({ device_id: row.device_id, name: row.name, platform: row.platform,
    metadata: parseJson(row.metadata_json, {}), created_at: row.created_at,
    updated_at: row.updated_at, last_seen_at: row.last_seen_at });
}

async function bootstrap(request, db, userId, includeDeleted) {
  const deviceId = request.method === "POST" ? text((await readJson(request)).device_id) : null;
  const [bookmarks, history, settings, bookmarkCount] = await Promise.all([
    listRecords(db, userId, "bookmarks", includeDeleted),
    listRecords(db, userId, "history", includeDeleted),
    listSettingsRows(db, userId),
    db.prepare("SELECT COUNT(*) AS count FROM bookmarks WHERE user_id = ?").bind(userId).first(),
  ]);
  return json({ user_id: userId, device_id: deviceId, server_time: now(),
    bookmarks, history, settings, bookmark_count: Number(bookmarkCount?.count || 0) });
}

async function handleCollection(request, db, userId, kind, id, includeDeleted) {
  if (request.method === "GET" && !id) {
    return json({ records: await listRecords(db, userId, kind, includeDeleted) });
  }
  if ((request.method === "POST" || request.method === "PUT") && (id || request.method === "POST")) {
    const body = await readJson(request);
    if (Array.isArray(body) || Array.isArray(body.records) || Array.isArray(body[kind])) {
      const records = await upsertRecords(db, userId, kind, recordsFromBody(body, kind));
      return json({ records });
    }
    if (id) body[kind === "bookmarks" ? "bookmark_id" : "history_id"] = id;
    const record = await upsertRecord(db, userId, kind, body);
    return json(record);
  }
  if (request.method === "DELETE" && id) {
    const record = await deleteRecord(db, userId, kind, id);
    return json(record);
  }
  throw new ApiError(404, "Not found");
}

async function syncCollection(request, db, userId, kind, includeDeleted) {
  const body = await readJson(request);
  const records = recordsFromBody(body, kind);
  if (!records.every((record) => record && typeof record === "object" && !Array.isArray(record))) {
    throw new ApiError(400, "records must be an array of objects");
  }
  await upsertRecords(db, userId, kind, records);
  return json({ records: await listRecords(db, userId, kind, includeDeleted) });
}

async function upsertRecords(db, userId, kind, records) {
  for (const record of records) await upsertRecord(db, userId, kind, record);
  return listRecords(db, userId, kind, true);
}

async function upsertRecord(db, userId, kind, record) {
  const id = idFor(record, kind);
  const updatedAt = timestamp(record.updated_at);
  const createdAt = timestamp(record.created_at || updatedAt);
  const deleted = Boolean(record.deleted || record.is_deleted) ? 1 : 0;
  const table = kind === "bookmarks" ? "bookmarks" : "download_history";
  const idColumn = kind === "bookmarks" ? "bookmark_id" : "history_id";
  const values = kind === "bookmarks"
    ? [userId, id, text(record.device_id), text(record.title), text(record.url),
      text(record.thumbnail_url ?? record.cover_url), text(record.chapter_id),
      text(record.chapter_title), number(record.progress), jsonText(record), deleted,
      createdAt, updatedAt]
    : [userId, id, text(record.device_id), text(record.title), text(record.url),
      text(record.thumbnail_url ?? record.cover_url), text(record.chapter_id),
      text(record.chapter_title), text(record.downloaded_at), jsonText(record), deleted,
      createdAt, updatedAt];
  const columns = kind === "bookmarks"
    ? "user_id, bookmark_id, device_id, title, url, thumbnail_url, chapter_id, chapter_title, progress, payload_json, is_deleted, created_at, updated_at"
    : "user_id, history_id, device_id, title, url, thumbnail_url, chapter_id, chapter_title, downloaded_at, payload_json, is_deleted, created_at, updated_at";
  await db.prepare(`
    INSERT INTO ${table} (${columns}) VALUES (${values.map(() => "?").join(", ")})
    ON CONFLICT(user_id, ${idColumn}) DO UPDATE SET
      device_id = excluded.device_id,
      title = excluded.title,
      url = excluded.url,
      thumbnail_url = excluded.thumbnail_url,
      chapter_id = excluded.chapter_id,
      chapter_title = excluded.chapter_title,
      ${kind === "bookmarks" ? "progress = excluded.progress," : "downloaded_at = excluded.downloaded_at,"}
      payload_json = excluded.payload_json,
      is_deleted = excluded.is_deleted,
      updated_at = excluded.updated_at
    WHERE excluded.updated_at >= ${table}.updated_at
  `).bind(...values).run();
  const row = await db.prepare(`SELECT * FROM ${table} WHERE user_id = ? AND ${idColumn} = ?`)
    .bind(userId, id).first();
  return recordResponse(row, kind);
}

async function listRecords(db, userId, kind, includeDeleted) {
  const table = kind === "bookmarks" ? "bookmarks" : "download_history";
  const idColumn = kind === "bookmarks" ? "bookmark_id" : "history_id";
  const deletedClause = includeDeleted ? "" : " AND is_deleted = 0";
  const result = await db.prepare(`SELECT * FROM ${table} WHERE user_id = ?${deletedClause} ORDER BY updated_at DESC`)
    .bind(userId).all();
  return result.results.map((row) => recordResponse(row, kind));
}

async function deleteRecord(db, userId, kind, id) {
  const existing = await db.prepare(`SELECT payload_json, created_at FROM ${kind === "bookmarks" ? "bookmarks" : "download_history"} WHERE user_id = ? AND ${kind === "bookmarks" ? "bookmark_id" : "history_id"} = ?`)
    .bind(userId, id).first();
  const payload = existing ? parseJson(existing.payload_json, {}) : {};
  payload.deleted = true;
  payload.is_deleted = true;
  payload.updated_at = now();
  payload[kind === "bookmarks" ? "bookmark_id" : "history_id"] = id;
  return upsertRecord(db, userId, kind, { ...payload, deleted: true,
    created_at: existing?.created_at || payload.updated_at, updated_at: payload.updated_at });
}

async function listSettingsRows(db, userId) {
  const result = await db.prepare("SELECT * FROM settings WHERE user_id = ? ORDER BY updated_at DESC")
    .bind(userId).all();
  return result.results.map(settingResponse);
}

async function listSettings(db, userId) {
  return json({ records: await listSettingsRows(db, userId) });
}

async function syncSettings(request, db, userId) {
  const body = await readJson(request);
  const settings = recordsFromBody(body, "settings");
  if (!settings.every((setting) => setting && typeof setting === "object" && !Array.isArray(setting))) {
    throw new ApiError(400, "settings must be an array of objects");
  }
  for (const setting of settings) await upsertSettingBody(db, userId, setting);
  return json({ records: await listSettingsRows(db, userId) });
}

async function upsertSetting(request, db, userId, pathKey) {
  const body = await readJson(request);
  if (Array.isArray(body) || Array.isArray(body.records) || Array.isArray(body.settings)) {
    for (const setting of recordsFromBody(body, "settings")) await upsertSettingBody(db, userId, setting);
    return json({ records: await listSettingsRows(db, userId) });
  }
  if (pathKey) body.key = pathKey;
  const row = await upsertSettingBody(db, userId, body);
  return json(row);
}

async function upsertSettingBody(db, userId, setting) {
  const key = text(setting.key);
  if (!key) throw new ApiError(400, "key is required");
  if (!Object.prototype.hasOwnProperty.call(setting, "value")) {
    throw new ApiError(400, "value is required");
  }
  const updatedAt = timestamp(setting.updated_at);
  const createdAt = timestamp(setting.created_at || updatedAt);
  const deviceId = text(setting.device_id) || "";
  await db.prepare(`
    INSERT INTO settings (user_id, "key", device_id, value_json, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, "key", device_id) DO UPDATE SET
      value_json = excluded.value_json,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
      WHERE excluded.updated_at >= settings.updated_at
  `).bind(userId, key, deviceId, jsonText(setting.value), jsonText(setting), createdAt, updatedAt).run();
  const row = await db.prepare("SELECT * FROM settings WHERE user_id = ? AND \"key\" = ? AND device_id = ?")
    .bind(userId, key, deviceId).first();
  return settingResponse(row);
}
