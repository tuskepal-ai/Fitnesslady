// FILE: /hu/shared/firebase.js
// Firebase v9 modular (CDN) — shared helpers (PRO baseline) + Chat helpers

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import * as fs from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

/**
 * Admin email(ek)
 */
export const ADMIN_EMAILS = [
  "tuskepal@gmail.com",
];

export const BASE_PREFIX = ""; // GitHub Pages root

// ✅ Firebase config (a te projekted)
export const firebaseConfig = {
  apiKey: "AIzaSyBl2MzyiRzgCzeg-eEWNHkc9Vxx-PgawfU",
  authDomain: "fitneady-15fd0.firebaseapp.com",
  projectId: "fitneady-15fd0",
  storageBucket: "fitneady-15fd0.firebasestorage.app",
  messagingSenderId: "480597492603",
  appId: "1:480597492603:web:2ba6c266c662b4c79e33de",
  measurementId: "G-MH1YK9C2YF"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = fs.getFirestore(app);
export const storage = getStorage(app);

// Persist login
setPersistence(auth, browserLocalPersistence).catch(()=>{});

export { fs };

// ---------- Helpers ----------
export function escapeHtml(str){
  const s = String(str ?? "");
  return s
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}
export function safeJsonParse(txt, fallback=null){
  try{ return JSON.parse(txt); }catch{ return fallback; }
}
export function clamp(n, a, b){
  const x = Number(n);
  return Math.min(b, Math.max(a, x));
}
export function todayISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
export function fmtDate(iso){
  if(!iso) return "—";
  try{
    const d = new Date(iso);
    return d.toLocaleDateString("hu-CH", { year:"numeric", month:"2-digit", day:"2-digit" });
  }catch{ return String(iso); }
}
export function daysBetween(aIso, bIso){
  try{
    const a = new Date(aIso);
    const b = new Date(bIso);
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / (1000*60*60*24));
  }catch{ return 0; }
}

export function normalizeEmail(email){
  return String(email || "").trim().toLowerCase();
}

export function normalizePlanId(planId){
  const v = String(planId || "").trim().toLowerCase();
  if(!v) return "start_v1";
  if(v === "start") return "start_v1";
  if(v === "balance") return "balance_v1";
  if(v === "pro" || v === "por") return "pro_v1";
  return String(planId || "start_v1").trim();
}

export function getQueryParam(name, url = window.location.href){
  try{
    const u = new URL(url);
    return (u.searchParams.get(name) || "").trim();
  }catch{
    return "";
  }
}

// ---------- Navigation ----------
export function toLogin(lang="hu"){
  const l = (lang === "de") ? "de" : "hu";
  window.location.href = `${BASE_PREFIX}/${l}/login/`;
}
export function toApp(lang="hu"){
  const l = (lang === "de") ? "de" : "hu";
  window.location.href = `${BASE_PREFIX}/${l}/app/`;
}
export function toAdmin(lang="hu"){
  const l = (lang === "de") ? "de" : "hu";
  window.location.href = `${BASE_PREFIX}/${l}/admin/`;
}

// ---------- Auth ----------
export function onAuth(cb){
  return onAuthStateChanged(auth, cb);
}
export async function logout(){
  await signOut(auth);
}
export async function loginEmailPassword(email, password){
  return await signInWithEmailAndPassword(auth, email, password);
}

// ---------- Profile bootstrap & role check ----------
export function isAdminEmail(email){
  const e = normalizeEmail(email);
  return ADMIN_EMAILS.map(x=>normalizeEmail(x)).includes(e);
}

export async function ensureUserDoc(uid, email){
  const ref = fs.doc(db, "users", uid);
  const snap = await fs.getDoc(ref);

  if(!snap.exists()){
    const initial = {
      email: email || "",
      name: "",

      role: "user",
      status: "active",
      planId: "start_v1",
      goal: "Formálás",
      level: 2,
      lang: "hu",
      lifetimeAccess: true,
      cycleStart: null,
      cycleEnd: null,

      dietPlan: {},

      welcomeCard: { title:"", text:"", video:"" },

      motivationCard: {
        title: "A rendszer szabadság.",
        text: "Nem kell tökéletesnek lenned. Elég, ha következetes vagy."
      },

      techVault: { items: [] },

      // Payment flags (admin a source of truth)
      paid: false,
      activated: false,
      payment: {
        provider: "",
        sid: "",
        status: "none" // none | pending_activation | activated
      },

      // Chat flags (ha később akarod szabályozni)
      chatEnabled: false,
      chatTrialUntil: null,

      createdAt: fs.serverTimestamp(),
      updatedAt: fs.serverTimestamp()
    };
    await fs.setDoc(ref, initial, { merge: true });
    return initial;
  }else{
    const data = snap.data() || {};
    const patch = {};

    if(email && data.email !== email){
      patch.email = email;
      patch.updatedAt = fs.serverTimestamp();
    }
    if(!("name" in data)) patch.name = "";
    if(!data.motivationCard){
      patch.motivationCard = {
        title: "A rendszer szabadság.",
        text: "Nem kell tökéletesnek lenned. Elég, ha következetes vagy."
      };
    }
    if(!data.welcomeCard) patch.welcomeCard = { title:"", text:"", video:"" };
    if(!data.dietPlan) patch.dietPlan = {};
    if(!data.techVault) patch.techVault = { items: [] };
    if(typeof data.paid !== "boolean") patch.paid = false;
    if(typeof data.activated !== "boolean") patch.activated = false;
    if(!data.payment) patch.payment = { provider:"", sid:"", status:"none" };
    if(typeof data.chatEnabled !== "boolean") patch.chatEnabled = false;
    if(!("chatTrialUntil" in data)) patch.chatTrialUntil = null;

    if(Object.keys(patch).length){
      patch.updatedAt = fs.serverTimestamp();
      await fs.setDoc(ref, patch, { merge:true });
    }
    const snap2 = await fs.getDoc(ref);
    return snap2.data() || data;
  }
}

export async function getUserRole(uid){
  const ref = fs.doc(db, "users", uid);
  const snap = await fs.getDoc(ref);
  if(!snap.exists()) return null;
  const role = String((snap.data()?.role || "")).toLowerCase();
  return role || null;
}

// ---------- Purchases / Stripe ----------
export async function upsertPurchaseFromStripe({ sid, planId, email, uid }){
  const _sid = String(sid || "").trim();
  if(!_sid) throw new Error("Missing sid");
  const _planId = normalizePlanId(planId);
  const _email = normalizeEmail(email);

  const pref = fs.doc(db, "purchases", _sid);
  await fs.setDoc(pref, {
    provider: "stripe",
    sid: _sid,
    planId: _planId,
    email: _email,
    uid: uid || "",
    status: "pending_activation",
    createdAt: fs.serverTimestamp(),
    updatedAt: fs.serverTimestamp()
  }, { merge:true });

  return _sid;
}

export async function activateUserFromPurchase({ uid, sid }){
  const _uid = String(uid || "").trim();
  const _sid = String(sid || "").trim();
  if(!_uid) throw new Error("Missing uid");
  if(!_sid) throw new Error("Missing sid");

  const pref = fs.doc(db, "purchases", _sid);
  const ps = await fs.getDoc(pref);
  if(!ps.exists()) throw new Error("Purchase not found");

  const pd = ps.data() || {};
  const planId = normalizePlanId(pd.planId || "start_v1");
  const email = normalizeEmail(pd.email || "");

  await fs.setDoc(fs.doc(db, "users", _uid), {
    email: email || undefined,
    planId,
    status: "active",
    paid: true,
    activated: true,
    payment: { provider: "stripe", sid: _sid, status: "activated" },
    updatedAt: fs.serverTimestamp()
  }, { merge:true });

  await fs.setDoc(pref, {
    uid: _uid,
    status: "activated",
    activatedAt: fs.serverTimestamp(),
    updatedAt: fs.serverTimestamp()
  }, { merge:true });

  return { uid:_uid, sid:_sid, planId };
}

export async function listRecentPurchases(max=40){
  const m = clamp(parseInt(max,10) || 40, 1, 120);
  const col = fs.collection(db, "purchases");
  const snap = await fs.getDocs(fs.query(col, fs.orderBy("createdAt","desc"), fs.limit(m)));
  return snap.docs.map(d => ({ id:d.id, ...(d.data()||{}) }));
}

// =========================
// CHAT (admin + app)
// chats/{uid}
// chats/{uid}/messages/{mid}
// =========================
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
    await fs.setDoc(r, { ...base, ...meta }, { merge:true });
    return;
  }

  const d = snap.data() || {};
  const fix = {};
  if(!("lastMessageText" in d)) fix.lastMessageText = "";
  if(!("lastUserReadAt" in d)) fix.lastUserReadAt = fs.serverTimestamp();
  if(Object.keys(fix).length){
    await fs.setDoc(r, fix, { merge:true }).catch(()=>{});
  }
  if(meta && Object.keys(meta).length){
    await fs.setDoc(r, meta, { merge:true }).catch(()=>{});
  }
}

async function updateThreadMeta(uid, sender, textPreview){
  await fs.setDoc(fs.doc(db, "chats", uid), {
    lastMessageAt: fs.serverTimestamp(),
    lastMessageSender: sender,
    lastMessageText: String(textPreview || "").slice(0, 180)
  }, { merge:true }).catch(()=>{});
}

export function listenChatMessages(uid, cb){
  const q = fs.query(
    fs.collection(db, "chats", uid, "messages"),
    fs.orderBy("createdAt", "asc"),
    fs.limit(250)
  );
  return fs.onSnapshot(q, (snap)=>{
    const items = [];
    snap.forEach(d => items.push({ id:d.id, ...(d.data()||{}) }));
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
    await fs.setDoc(fs.doc(db, "chats", uid), { lastUserReadAt: fs.serverTimestamp() }, { merge:true }).catch(()=>{});
  }else{
    await fs.setDoc(fs.doc(db, "chats", uid), { lastAdminReadAt: fs.serverTimestamp() }, { merge:true }).catch(()=>{});
  }
}

// (később, ha kell kép küldés)
export async function sendChatImage(uid, sender, file){
  if(!file) return;
  const f = file;
  const ext = (f.name || "img").split(".").pop().slice(0,6);
  const safeExt = ext.match(/^[a-zA-Z0-9]+$/) ? ext : "jpg";
  const path = `chat_uploads/${uid}/${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;

  const r = storageRef(storage, path);
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

export async function markAdminRead(uid){
  await fs.setDoc(fs.doc(db, "chats", uid), { lastAdminReadAt: fs.serverTimestamp() }, { merge:true }).catch(()=>{});
}
export async function markUserRead(uid){
  await fs.setDoc(fs.doc(db, "chats", uid), { lastUserReadAt: fs.serverTimestamp() }, { merge:true }).catch(()=>{});
}
