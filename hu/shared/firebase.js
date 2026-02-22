/* FILE: /hu/shared/firebase.js */
/**
 * Firebase v9 CDN shared helpers (PRO baseline) + Chat additions (OP2)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import * as fs from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

export { fs };

/* =========================
   CONFIG + INIT
========================= */
export const BASE_PREFIX = ""; // ha kell alá-mappa github pagesnél, ide tedd: "/repo"

function showFatal(msg, details = null) {
  try {
    console.error("[FIREBASE FATAL]", msg, details || "");
    const el = document.createElement("div");
    el.style.cssText = `
      position:fixed; left:12px; right:12px; bottom:12px; z-index:99999;
      background:rgba(0,0,0,.72); color:#fff; border:1px solid rgba(255,255,255,.18);
      border-radius:16px; padding:12px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 24px 80px rgba(0,0,0,.55);
      white-space: pre-wrap; line-height:1.35; font-size:12.5px;
    `;
    el.textContent =
      `FIREBASE CONFIG HIBA:\n${msg}\n` +
      (details ? `\n${typeof details === "string" ? details : JSON.stringify(details, null, 2)}` : "") +
      `\n\nTipp: töltsd ki a /hu/shared/firebase.js-ben a firebaseConfig mezőket (apiKey, authDomain, projectId, stb.).`;
    document.body.appendChild(el);
  } catch (_) {}
}

const firebaseConfig = window.FIREBASE_CONFIG || {
  // ❗ IDE kell a Firebase Web App config
  // Firebase Console → Project settings → Your apps (Web) → "Config"
  apiKey: "FILL_API_KEY",
  authDomain: "FILL_AUTH_DOMAIN",
  projectId: "FILL_PROJECT_ID",
  storageBucket: "FILL_STORAGE_BUCKET",
  messagingSenderId: "FILL_MESSAGING_SENDER_ID",
  appId: "FILL_APP_ID"
};

function validateFirebaseConfig(cfg) {
  const required = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
  const missing = required.filter(k => !cfg || !String(cfg[k] || "").trim() || String(cfg[k]).startsWith("FILL_"));
  return { ok: missing.length === 0, missing };
}

const v = validateFirebaseConfig(firebaseConfig);
if (!v.ok) {
  showFatal(
    `Hiányzó / placeholder Firebase config mezők: ${v.missing.join(", ")}`,
    firebaseConfig
  );
  // Ne menjen tovább "néma" hibával
  throw new Error("Firebase config missing: " + v.missing.join(", "));
}

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  showFatal("initializeApp() hiba", e?.message || String(e));
  throw e;
}

export const auth = getAuth(app);
export const db = fs.getFirestore(app);
export const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence).catch((e)=>{
  console.warn("Auth persistence warning:", e?.message || e);
});

/* =========================
   NAV
========================= */
export function toLogin(lang="hu"){ location.href = `${BASE_PREFIX}/${lang}/login/`; }
export function toApp(lang="hu"){ location.href = `${BASE_PREFIX}/${lang}/app/`; }
export function toAdmin(lang="hu"){ location.href = `${BASE_PREFIX}/${lang}/admin/`; }

/* =========================
   AUTH
========================= */
export function onAuth(cb){
  return onAuthStateChanged(auth, cb);
}
export async function logout(){
  await signOut(auth);
}

/* =========================
   UTIL
========================= */
export function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
export function safeJsonParse(s, fallback=null){
  try{ return JSON.parse(s); }catch(_){ return fallback; }
}
export function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
export function clamp(n, a, b){
  const x = Number(n);
  return Math.max(a, Math.min(b, x));
}
export function daysBetween(isoA, isoB){
  const a = new Date(`${isoA}T00:00:00`).getTime();
  const b = new Date(`${isoB}T00:00:00`).getTime();
  return Math.round((b - a) / (24*60*60*1000));
}
export function fmtDate(iso){
  if(!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("hu-CH", { year:"numeric", month:"2-digit", day:"2-digit" });
}

/* =========================
   USER DOC (OP2 fields)
========================= */
export async function ensureUserDoc(uid, patch = {}){
  const r = fs.doc(db, "users", uid);
  const snap = await fs.getDoc(r);

  if(!snap.exists()){
    await fs.setDoc(r, {
      createdAt: fs.serverTimestamp(),
      paid: false,
      chatEnabled: false,
      chatTrialUntil: null,
      ...patch
    }, { merge: true });
    return;
  }

  const d = snap.data() || {};
  const fix = {};
  if(typeof d.paid !== "boolean") fix.paid = false;
  if(typeof d.chatEnabled !== "boolean") fix.chatEnabled = false;
  if(!("chatTrialUntil" in d)) fix.chatTrialUntil = null;

  if(Object.keys(fix).length){
    await fs.updateDoc(r, fix).catch(()=>{});
  }
  if(patch && Object.keys(patch).length){
    await fs.updateDoc(r, patch).catch(()=>{});
  }
}

export async function getUserDoc(uid){
  const snap = await fs.getDoc(fs.doc(db, "users", uid));
  return snap.exists() ? (snap.data() || null) : null;
}

/**
 * ✅ OP2: chat allowed when:
 * - paid === true OR chatEnabled === true OR chatTrialUntil > now
 */
export function isChatAllowed(userDoc){
  if(!userDoc) return false;
  if(userDoc.paid === true) return true;
  if(userDoc.chatEnabled === true) return true;

  const t = userDoc.chatTrialUntil;
  let ms = 0;
  if(t?.toDate) ms = t.toDate().getTime();
  else if(typeof t === "number") ms = t;
  else if(t instanceof Date) ms = t.getTime();
  return !!ms && ms > Date.now();
}

/* =========================
   CHAT MODEL
   chats/{uid} thread meta
   chats/{uid}/messages/{mid}
========================= */
export async function ensureChatThread(uid, meta = {}){
  const r = fs.doc(db, "chats", uid);
  const snap = await fs.getDoc(r);

  const base = {
    uid,
    createdAt: fs.serverTimestamp(),
    lastMessageAt: null,
    lastMessageSender: null,
    lastMessageText: "",
    lastAdminReadAt: null,
    lastUserReadAt: fs.serverTimestamp()
  };

  if(!snap.exists()){
    await fs.setDoc(r, { ...base, ...meta }, { merge: true });
    return;
  }

  const d = snap.data() || {};
  const fix = {};
  if(!("lastMessageText" in d)) fix.lastMessageText = "";
  if(!("lastUserReadAt" in d)) fix.lastUserReadAt = fs.serverTimestamp();
  if(Object.keys(fix).length){
    await fs.updateDoc(r, fix).catch(()=>{});
  }
  if(meta && Object.keys(meta).length){
    await fs.updateDoc(r, meta).catch(()=>{});
  }
}

async function updateThreadMeta(uid, sender, textPreview){
  await fs.updateDoc(fs.doc(db, "chats", uid), {
    lastMessageAt: fs.serverTimestamp(),
    lastMessageSender: sender,
    lastMessageText: String(textPreview || "").slice(0, 180)
  }).catch(()=>{});
}

export function listenChatMessages(uid, cb){
  const q = fs.query(
    fs.collection(db, "chats", uid, "messages"),
    fs.orderBy("createdAt", "asc"),
    fs.limit(200)
  );
  return fs.onSnapshot(q, (snap)=>{
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...(d.data()||{}) }));
    cb(items);
  });
}

export async function sendChatText(uid, sender, text){
  const clean = String(text||"").trim();
  if(!clean) return;

  await fs.addDoc(fs.collection(db, "chats", uid, "messages"), {
    sender,
    type: "text",
    text: clean,
    createdAt: fs.serverTimestamp()
  });

  await updateThreadMeta(uid, sender, clean);

  if(sender === "user"){
    await fs.updateDoc(fs.doc(db, "chats", uid), { lastUserReadAt: fs.serverTimestamp() }).catch(()=>{});
  }else{
    await fs.updateDoc(fs.doc(db, "chats", uid), { lastAdminReadAt: fs.serverTimestamp() }).catch(()=>{});
  }
}

export async function sendChatImage(uid, sender, file){
  if(!file) return;
  const f = file;
  const ext = (f.name || "img").split(".").pop().slice(0,6);
  const safeExt = ext.match(/^[a-zA-Z0-9]+$/) ? ext : "jpg";
  const path = `chat_uploads/${uid}/${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;

  const r = ref(storage, path);
  await uploadBytes(r, f, { contentType: f.type || "image/jpeg" });
  const url = await getDownloadURL(r);

  await fs.addDoc(fs.collection(db, "chats", uid, "messages"), {
    sender,
    type: "image",
    imageUrl: url,
    text: "",
    createdAt: fs.serverTimestamp()
  });

  await updateThreadMeta(uid, sender, "📷 Kép");
}

export function createJitsiRoomName(uid){
  return `fitnesslady_${uid}_${Math.random().toString(36).slice(2,10)}`;
}

export async function sendCallInvite(uid, sender, room){
  const rr = String(room||"").slice(0, 80);
  await fs.addDoc(fs.collection(db, "chats", uid, "messages"), {
    sender,
    type: "call",
    callRoom: rr,
    text: "",
    createdAt: fs.serverTimestamp()
  });
  await updateThreadMeta(uid, sender, "🎥 Videóhívás");
}

export async function markAdminRead(uid){
  await fs.updateDoc(fs.doc(db, "chats", uid), { lastAdminReadAt: fs.serverTimestamp() }).catch(()=>{});
}
export async function markUserRead(uid){
  await fs.updateDoc(fs.doc(db, "chats", uid), { lastUserReadAt: fs.serverTimestamp() }).catch(()=>{});
}

export function listenChatThreads(cb){
  const q = fs.query(fs.collection(db, "chats"), fs.orderBy("lastMessageAt", "desc"), fs.limit(200));
  return fs.onSnapshot(q, (snap)=>{
    const items = [];
    snap.forEach(d=>items.push({ id:d.id, ...(d.data()||{}) }));
    cb(items);
  });
}
