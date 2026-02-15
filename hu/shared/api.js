// hu/shared/api.js
// CORS preflight-mentes: text/plain
const API_URL = "https://script.google.com/macros/s/AKfycbxV25i0DyG4LApX3QhB_36sPdj-Nqe5Nrto56EczoDReuD0qnLBQUYpYp634WuxfLzp4Q/exec";

async function apiCall(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // Ha nem JSON válasz jönne, itt dobna – ez így jó, gyorsan kiderül
  return await res.json();
}
