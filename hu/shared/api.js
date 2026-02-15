// hu/shared/api.js
// CORS preflight-mentes: text/plain
const API_URL = "https://script.google.com/macros/s/AKfycbxpvOYvIH9zObRHMvEH2XtP8TAmpE8Bs9UEaT7xJAL8A2LloEFArC2CT8rbVa5n24Zfew/exec";

async function apiCall(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // Ha nem JSON válasz jönne, itt dobna – ez így jó, gyorsan kiderül
  return await res.json();
}
