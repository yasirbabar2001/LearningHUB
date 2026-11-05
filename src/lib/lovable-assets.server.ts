// Images uploaded through Lovable (src/assets/*.asset.json) are served from
// Lovable's CDN under `/__l5e/assets-v1/...`. On Lovable hosting that path is
// answered before the app runs; on a self-hosted Node.js server it would 404.
//
// Set LOVABLE_ASSETS_ORIGIN to the published Lovable URL of this project
// (e.g. https://abhi-learning-hub.lovable.app) and those requests are
// forwarded there. When the variable is unset this is a no-op.

const ASSET_PREFIX = "/__l5e/assets-v1/";

export async function proxyLovableAsset(request: Request): Promise<Response | undefined> {
  const origin = process.env["LOVABLE_ASSETS_ORIGIN"]?.trim().replace(/\/+$/, "");
  if (!origin) return undefined;
  if (request.method !== "GET" && request.method !== "HEAD") return undefined;

  const url = new URL(request.url);
  if (!url.pathname.startsWith(ASSET_PREFIX)) return undefined;

  try {
    const upstream = await fetch(origin + url.pathname, { method: request.method });
    const headers = new Headers();
    for (const name of ["content-type", "content-length", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (upstream.ok) headers.set("cache-control", "public, max-age=86400");
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error(`[assets] Failed to fetch ${url.pathname} from ${origin}:`, error);
    return new Response("Asset unavailable", { status: 502 });
  }
}
