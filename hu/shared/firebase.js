/* FILE: /hu/shared/firebase.js */
/**
 * Firebase v9 CDN shared helpers (PRO baseline) + Chat additions (OP2)
 *
 * ✅ FIX: beégetett firebaseConfig (apiKey/authDomain stb.)
 * ✅ FIX: hiányzó exportok a /hu/login és /hu/admin oldalhoz
 * ✅ FIX: fájl vége nem volt lezárva (syntax error)
 *
 * Exports used by existing pages:
 * - BASE_PREFIX, auth, db, fs, storage
 * - onAuth, logout, toLogin, toApp, toAdmin
 * - escapeHtml, safeJsonParse, todayISO, clamp, daysBetween, fmtDate
 * - loginEmailPassword
 * - ensureUserDoc, getUserDoc, getUserRole, isAdminEmail
 * - listRecentPurchases, activateUserFromPurchase
 *
 * Chat exports:
 * - isChatAllowed, ensureChatThread, listenChatMessages, sendChatText, sendChatImage
 * - listenChatThreads, markAdminRead, markUserRead, createJitsiRoomName, sendCallInvite
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword
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

// ✅ Default config (a te Firebase web configod)
// Ha valaha szeretnéd külsőből felülírni: window.FIREBASE_CONFIG = {...}
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBl2MzyiRzgCzeg-eEWNHkc9Vxx-PgawfU",
  authDomain: "fitneady-15fd0.firebaseapp.com",
  projectId: "fitneady-15fd0",
  storageBucket: "fitneady-15fd0.firebasestorage.app",
  messagingSenderId: "480597492603",
  appId: "1:480597492603:web:2ba6c266c662b4c79e33de",
  measurementId: "G-MH1YK9C2YF"
};

const firebaseConfig = (window.FIREBASE_CONFIG && typeof window.FIREBASE_CONFIG === "object")
  ? window.FIREBASE_CONFIG
  : DEFAULT_FIREBASE_CONFIG;

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = fs.getFirestore(app);
export const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence).catch(()=>{});

/* =========================
   ADMIN EMAILS (hard allow)
========================= */
const ADMIN_EMAILS = [
  "tuskepal@gmail.com"
];

export function isAdminEmail(email){
  const e = String(email || "").trim().toLowerCase();
  return ADMIN_EMAILS.includes(e);
}

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
export async function loginEmailPassword(email, pass){
  return await signInWithEmailAndPassword(auth, String(email||""), String(pass||""));
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
      updatedAt: fs.serverTimestamp(),

      email: patch?.email || "",
      name: patch?.name || "",
      role: patch?.role || "user",
      status: patch?.status || "active",
      lang: patch?.lang || "hu",

      paid: false,
      activated: false,
      payment: { provider:"", sid:"", status:"none" },

      chatEnabled: false,
      chatTrialUntil: null,

      ...patch
    }, { merge: true });
    return { ...(patch||{}), paid:false, chatEnabled:false, chatTrialUntil:null };
  }

  const d = snap.data() || {};
  const fix = {};
  if(typeof d.paid !== "boolean") fix.paid = false;
  if(typeof d.activated !== "boolean") fix.activated = false;
  if(typeof d.chatEnabled !== "boolean") fix.chatEnabled = false;
  if(!("chatTrialUntil" in d)) fix.chatTrialUntil = null;
  if(!("payment" in d)) fix.payment = { provider:"", sid:"", status:"none" };
  if(!("role" in d)) fix.role = "user";
  if(!("status" in d)) fix.status = "active";
  if(!("lang" in d)) fix.lang = "hu";

  if(Object.keys(fix).length){
    await fs.updateDoc(r, { ...fix, updatedAt: fs.serverTimestamp() }).catch(()=>{});
  }
  if(patch && Object.keys(patch).length){
    await fs.updateDoc(r, { ...patch, updatedAt: fs.serverTimestamp() }).catch(()=>{});
  }

  return { ...d, ...fix, ...(patch||{}) };
}

export async function getUserDoc(uid){
  const snap = await fs.getDoc(fs.doc(db, "users", uid));
  return snap.exists() ? (snap.data() || null) : null;
}

export async function getUserRole(uid){
  const d = await getUserDoc(uid);
  return d?.role || "user";
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
   PAYMENTS (Stripe → Firestore)
   purchases/{sid} (recommended)
========================= */
function normalizePurchaseDoc(d, id){
  return {
    id,
    sid: d?.sid || id,
    email: d?.email || "",
    uid: d?.uid || "",
    planId: d?.planId || d?.plan || "",
    status: d?.status || "pending_activation",
    createdAt: d?.createdAt || null,
    updatedAt: d?.updatedAt || null
  };
}

export async function listRecentPurchases(limitN=50){
  const q = fs.query(
    fs.collection(db, "purchases"),
    fs.orderBy("createdAt", "desc"),
    fs.limit(clamp(limitN, 1, 200))
  );
  const snap = await fs.getDocs(q);
  return snap.docs.map(docu => normalizePurchaseDoc(docu.data() || {}, docu.id));
}

async function findPurchaseBySid(sid){
  const id = String(sid || "").trim();
  if(!id) return null;

  // 1) try direct doc id
  const direct = await fs.getDoc(fs.doc(db, "purchases", id));
  if(direct.exists()){
    return { ref: fs.doc(db, "purchases", id), data: normalizePurchaseDoc(direct.data()||{}, id) };
  }

  // 2) fallback query by field "sid"
  const q = fs.query(fs.collection(db, "purchases"), fs.where("sid", "==", id), fs.limit(1));
  const snap = await fs.getDocs(q);
  if(snap.empty) return null;

  const d0 = snap.docs[0];
  return { ref: d0.ref, data: normalizePurchaseDoc(d0.data()||{}, d0.id) };
}

/**
 * Admin action: kiválasztott purchase → kiválasztott user aktiválása
 * - user: paid=true, activated=true, planId beállít
 * - purchase: status="activated", uid beír, activatedAt timestamp
 */
export async function activateUserFromPurchase({ uid, sid }){
  const U = String(uid || "").trim();
  const S = String(sid || "").trim();
  if(!U) throw new Error("activateUserFromPurchase: uid hiányzik");
  if(!S) throw new Error("activateUserFromPurchase: sid hiányzik");

  const hit = await findPurchaseBySid(S);
  if(!hit) throw new Error("Nem találom a purchase rekordot (purchases/{sid}).");

  const p = hit.data;
  const planId = String(p.planId || "start_v1").trim() || "start_v1";

  // ensure user doc exists + update
  await ensureUserDoc(U, {});
  await fs.updateDoc(fs.doc(db, "users", U), {
    paid: true,
    activated: true,
    planId,
    payment: { provider:"stripe", sid: p.sid || S, status:"activated" },
    updatedAt: fs.serverTimestamp()
  });

  // purchase mark activated
  await fs.setDoc(hit.ref, {
    status: "activated",
    uid: U,
    activatedAt: fs.serverTimestamp(),
    updatedAt: fs.serverTimestamp()
  }, { merge:true });

  return { ok:true, planId, sid: p.sid || S, uid: U };
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
  const q = fs.query(
    fs.collection(db, "chats"),
    fs.orderBy("lastMessageAt", "desc"),
    fs.limit(200)
  );
  return fs.onSnapshot(q, (snap)=>{
    const items = [];
    snap.forEach(d=>items.push({ id:d.id, ...(d.data()||{}) }));
    cb(items);
  });
}
```0
