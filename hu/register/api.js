// hu/register/api.js

// 1) IDE tedd a *googleusercontent* végleges /exec URL-t (nem a script.google.com-ot)
const API_URL = "IDE_A_GOOGLEUSERCONTENT_EXEC_URL";

async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    // CORS megkerüléshez: simple request
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // Ha valami HTML-t ad vissza, itt fog kiderülni:
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`API nem JSON-t adott vissza: ${text.slice(0, 120)}`);
  }
}

// helper: token az URL-ből (?t=...)
function getTokenFromUrl() {
  const u = new URL(window.location.href);
  return u.searchParams.get("t") || "";
}

window.apiPost = apiPost;
window.getTokenFromUrl = getTokenFromUrl;
