// hu/shared/api.js
// CORS preflight-mentes: text/plain
const API_URL = "https://script.google.com/macros/s/AKfycbwKG1LVPgSRUfX_tk2gbujMw_mxSV6ks0Pn5CwKzGNgv9RRBlD1wPqWfP5__oD-qFG89w/exec";

async function apiCall(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // Ha nem JSON válasz jönne, itt dobna – ez így jó, gyorsan kiderül
  return await res.json();
}
