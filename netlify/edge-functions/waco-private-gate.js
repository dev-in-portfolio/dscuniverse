// Private Waco research gateway. This must run before all static redirects.
// No Waco research files are committed to the public DSCG repository.
const BASE = "/un-je-ne-sais-quoi_tx";
const UPSTREAM = "https://waco-field-notes.ribbedbag.chatgpt.site";
const COOKIE = "waco_client_session";
const SESSION_SECONDS = 12 * 60 * 60;
const encoder = new TextEncoder();

const commonHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
};

function response(body, status = 200, type = "text/html; charset=utf-8", extra = {}) {
  return new Response(body, {
    status,
    headers: { ...commonHeaders, "Content-Type": type, ...extra },
  });
}

function hex(bytes) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function sameSecret(a, b) {
  const [first, second] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return constantTimeEqual(hex(first), hex(second));
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function readCookie(request) {
  const value = request.headers.get("cookie") || "";
  for (const part of value.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return "";
}

async function validSession(request, secret) {
  const value = readCookie(request);
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^\d{10,13}$/.test(parts[1]) || !/^[0-9a-f]{64}$/.test(parts[2])) return false;
  const expiry = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiry) || expiry <= now || expiry > now + SESSION_SECONDS) return false;
  const expected = await sign("waco:v1:" + parts[1], secret);
  return constantTimeEqual(parts[2], expected);
}

function loginPage(error = false) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Client Research Access | DSCG</title>' +
  '<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 80% 15%,#20334b 0%,#0b1523 48%,#07101c 100%);color:#f7f8f9;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(100%,450px);padding:clamp(25px,6vw,44px);border:1px solid #42546b;border-radius:3px;background:#101e2e;box-shadow:0 24px 70px #0006}.kicker{color:#ffb186;letter-spacing:.19em;font-size:11px;font-weight:800;text-transform:uppercase}h1{font-size:clamp(28px,6vw,38px);line-height:1.08;letter-spacing:-.04em;margin:20px 0 13px}p{color:#b8c7d5;line-height:1.6}.name{color:#fff;font-weight:600;margin:0 0 24px}label{display:block;font-size:13px;font-weight:600;margin-bottom:10px}input{display:block;width:100%;border:1px solid #66809d;border-radius:3px;padding:15px;background:#091522;color:#fff;font:inherit;letter-spacing:.18em}input:focus-visible{outline:3px solid #ff9b70;outline-offset:2px}button{width:100%;margin-top:15px;background:#ef9b72;color:#0c1420;border:0;padding:15px;font-weight:800;font-size:14px;cursor:pointer}button:hover{background:#ffc19f}.error{padding:11px 13px;border-left:3px solid #ff927e;background:#452126;color:#ffddd5}a{color:#aad2ef}.footer{margin-top:29px;border-top:1px solid #36485a;padding-top:19px;font-size:12px}</style></head><body><main><div class="kicker">Dark Star Consulting Group / Client Portal</div><h1>Research models</h1><p class="name">Un je ne sais Quoi · Waco, Texas</p><p>Enter the private access code provided by DSCG to open your restaurant research workspace.</p>' +
  (error ? '<p class="error" role="alert">Code not recognized. Please enter either of the two five-digit access codes provided by DSCG.</p>' : '') +
  '<form action="' + BASE + '/__auth" method="post"><label for="pin">5-digit client access code</label><p id="pin-help" style="font-size:13px;margin:0 0 10px">Both original five-digit access codes are accepted here.</p><input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="off" aria-describedby="pin-help" maxlength="16" required autofocus><button type="submit">Open research models</button></form><p class="footer"><a href="/restaurant-consulting">← Return to Restaurant Consulting</a></p></main></body></html>';
}

function loginResponse(error = false) {
  return response(loginPage(error), 401);
}

function rewriteRootReferences(input) {
  // Existing Waco pages use root-relative links. Keep every resource behind this prefix.
  return input.replace(/(["'\x60])\/(?!\/|un-je-ne-sais-quoi_tx(?:\/|["'\x60]))/g, "$1" + BASE + "/")
    .replace(/url\(\s*\/(?!\/)/gi, "url(" + BASE + "/");
}

function rewriteHtml(input) {
  // The old browser-side PIN scripts are obsolete; the server now checks every request.
  return rewriteRootReferences(input)
    .replace(/<script\b[^>]*\bsrc=["'][^"']*pin-gate\.js["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<link\b[^>]*\bhref=["'][^"']*pin-gate\.css["'][^>]*\/?>/gi, "");
}

async function proxy(request, url, token) {
  const suffix = url.pathname.slice(BASE.length);
  const target = new URL((suffix || "/") + url.search, UPSTREAM);
  if (target.origin !== UPSTREAM) return response("Bad path", 400, "text/plain; charset=utf-8");
  const headers = new Headers({
    "OAI-Sites-Authorization": "Bearer " + token,
    "Accept": request.headers.get("accept") || "*/*",
  });
  for (const key of ["range", "if-range", "if-none-match", "if-modified-since"]) {
    if (request.headers.has(key)) headers.set(key, request.headers.get(key));
  }

  let upstream;
  try {
    upstream = await fetch(target, { method: request.method, headers, redirect: "manual" });
  } catch {
    return response("Research source temporarily unavailable.", 502, "text/plain; charset=utf-8");
  }
  if (upstream.status === 401 || upstream.status === 403) {
    return response("Research source access unavailable.", 502, "text/plain; charset=utf-8");
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("location");
    if (!location) return response("Unexpected source redirect.", 502, "text/plain; charset=utf-8");
    const redirect = new URL(location, target);
    if (redirect.origin !== UPSTREAM) return response("Source authentication unavailable.", 502, "text/plain; charset=utf-8");
    const safeDestination = BASE + redirect.pathname + redirect.search + redirect.hash;
    return response(null, upstream.status, "text/plain; charset=utf-8", { Location: safeDestination });
  }

  const type = upstream.headers.get("content-type") || "application/octet-stream";
  const outHeaders = new Headers(commonHeaders);
  outHeaders.set("Content-Type", type);
  for (const key of ["content-disposition", "content-range", "accept-ranges"]) {
    if (upstream.headers.has(key)) outHeaders.set(key, upstream.headers.get(key));
  }
  if (request.method === "HEAD" || upstream.status === 204 || upstream.status === 304) {
    return new Response(null, { status: upstream.status, headers: outHeaders });
  }
  const textLike = /(?:text\/html|(?:javascript|ecmascript)|text\/css|application\/json|text\/plain)/i.test(type);
  if (textLike && upstream.ok && upstream.status !== 206) {
    let body = await upstream.text();
    body = /text\/html/i.test(type) ? rewriteHtml(body) : rewriteRootReferences(body);
    return new Response(body, { status: upstream.status, headers: outHeaders });
  }
  // Stream binary images, PDF and spreadsheet downloads. Never copy them into public static files.
  return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
}

export default async function wacoPrivateGateway(request) {
  const url = new URL(request.url);
  if (url.pathname !== BASE && !url.pathname.startsWith(BASE + "/")) return;
  if (url.pathname === BASE) {
    return response(null, 308, "text/plain; charset=utf-8", { Location: BASE + "/" });
  }
  const pin = Netlify.env.get("WACO_ACCESS_PIN");
  const secondPin = Netlify.env.get("WACO_ACCESS_PIN_2");
  const secret = Netlify.env.get("WACO_SESSION_SECRET");
  const token = Netlify.env.get("WACO_SITES_UPSTREAM_TOKEN");
  if (!pin || !secondPin || !secret || !token) {
    return response("Research access is temporarily unavailable.", 503, "text/plain; charset=utf-8");
  }
  if (url.pathname === BASE + "/__auth") {
    if (request.method !== "POST") return response("Method not allowed.", 405, "text/plain; charset=utf-8", { Allow: "POST" });
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    if (origin ? origin !== url.origin : !(referer && referer.startsWith(url.origin + "/"))) {
      return response("Invalid request origin.", 403, "text/plain; charset=utf-8");
    }
    if (!(request.headers.get("content-type") || "").startsWith("application/x-www-form-urlencoded")) {
      return response("Invalid form.", 415, "text/plain; charset=utf-8");
    }
    const length = Number(request.headers.get("content-length") || "0");
    if (length > 512) return response("Invalid form.", 413, "text/plain; charset=utf-8");
    let submitted;
    try {
      submitted = (await request.formData()).get("pin");
      if (typeof submitted === "string") submitted = submitted.replace(/[\s-]/g, "");
    } catch {
      return loginResponse(true);
    }
    const validCode = typeof submitted === "string" && /^\d{5}$/.test(submitted) &&
      (await Promise.all([sameSecret(submitted, pin), sameSecret(submitted, secondPin)])).some(Boolean);
    if (!validCode) {
      return loginResponse(true);
    }
    const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const payload = "v1." + expiry;
    const signed = payload + "." + await sign("waco:v1:" + expiry, secret);
    return response(null, 303, "text/plain; charset=utf-8", {
      Location: BASE + "/",
      "Set-Cookie": COOKIE + "=" + signed + "; Path=" + BASE + "/; Max-Age=" + SESSION_SECONDS + "; HttpOnly; Secure; SameSite=Lax",
    });
  }

  const authorized = await validSession(request, secret);
  if (!authorized) {
    if (url.pathname === BASE + "/" && request.method === "GET") return loginResponse();
    return response("Client access required. Open " + BASE + "/ to enter your code.", 401, "text/plain; charset=utf-8");
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return response("Method not allowed.", 405, "text/plain; charset=utf-8", { Allow: "GET, HEAD" });
  }
  return proxy(request, url, token);
}

export const config = {
  path: ["/un-je-ne-sais-quoi_tx", "/un-je-ne-sais-quoi_tx/*"],
  onError: "fail",
};
