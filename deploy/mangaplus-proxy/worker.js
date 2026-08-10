export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetURL = "https://jumpg-assets.tokyo-cdn.com" + url.pathname + url.search;

    try {
      const resp = await fetch(targetURL, {
        method: request.method,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://mangaplus.shueisha.co.jp/",
          "Origin": "https://mangaplus.shueisha.co.jp",
          "Accept": "*/*"
        }
      });

      const responseHeaders = new Headers(resp.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Cache-Control", "public, max-age=86400");

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: responseHeaders
      });
    } catch (e) {
      return new Response("Proxy Error: " + e.message, { status: 500 });
    }
  }
};
