# Webtoon Cloud Sync

This Worker provides the private API used by the desktop app to synchronize bookmarks, download history, and preferences through Cloudflare D1.

## First Deployment

Run these commands from this directory:

```bash
npx wrangler d1 create webtoon-sync
```

Copy the returned database ID into `wrangler.toml`, then run:

```bash
npx wrangler d1 migrations apply webtoon-sync --remote
npx wrangler secret put SYNC_API_TOKEN
npx wrangler secret put SYNC_USER_ID
npx wrangler deploy
```

The value entered for `SYNC_API_TOKEN` is the same personal token entered in the desktop app under Settings > Cloud Sync. `SYNC_USER_ID` can remain `default` for a single private account.

## Desktop Configuration

Use the deployed Worker URL in the desktop app. The app stores the URL, token, user ID, and generated device ID in its local configuration. The token is never bundled into the React frontend.

The Worker health endpoint is public:

```text
GET /health
```

All `/v1/*` endpoints require the configured bearer token.
