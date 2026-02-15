// hu/shared/api.js
// CORS preflight-mentes: text/plain
const API_URL = "PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE";

async function apiCall(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // Ha nem JSON válasz jönne, itt dobna – ez így jó, gyorsan kiderül
  return await res.json();
}
