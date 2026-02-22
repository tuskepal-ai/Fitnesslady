/* FILE: /hu/shared/firebase.js */
/**
 * Firebase v9 CDN shared helpers (PRO baseline) + OP2 Chat
 *
 * ✅ FIX: valódi firebaseConfig beégetve (nincs üres/placeholder)
 * ✅ FIX: exportok kiegészítve, hogy a /hu/login, /hu/app, /hu/admin is működjön
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

/**
 * ✅ Itt van a config.
 * FONTOS: storageBucket legyen appspot.com (web SDK-hez ez a tipikus érték)
 */
const firebaseConfig = {
  apiKey: "AIzaSyBl2MzyiRzgCzeg-eEWNHkc9Vxx-PgawfU",
  authDomain: "fitneady-15fd0.firebaseapp.com",
  projectId: "fitneady-15fd0",
  storageBucket: "fitneady-15fd0.appspot.com",
  messagingSenderId: "480597492603",
  appId: "1:480597492603:web:2ba6c266c662b4c79e33de",
  measurementId: "G-MH1YK9C2YF"
};

// Biztonsági check: ha valami üres maradna, dobjon tiszta hibát
function assertConfig(cfg){
  const need = ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"];
  const missing = need.filter(k => !cfg[k] || String(cfg[k]).includes("FILL_") || String(cfg[k]).trim()==="");
  if(missing.length){
    const e = new Error("Firebase config hiányos: " + missing.join(", "));
    e.code = "firebase/config-missing";
    throw e;
  }
}
assertConfig(firebaseConfig);

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = fs.getFirestore(app);
export const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence).catch(()=>{});

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
export async function loginEmailPassword(email, password){
  return await signInWithEmailAndPassword(auth, email, password);
}

/* =========================
   ADMIN EMAILS / ROLE
========================= */
const ADMIN_EMAILS = [
  "tuskepal@gmail.com"
];

export function isAdminEmail(email){
  const e = String(email || "").trim().toLowerCase();
  return !!e && ADMIN_EMAILS.includes(e);
}

export async function getUserRole(uid){
  try{
    const snap = await fs.getDoc(fs.doc(db, "users", uid));
    if(!snap.exists()) return "user";
    const d = snap.data() || {};
    return (d.role || "user");
  }catch(_){
    return "user";
  }
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
   ⚠️ kompatibilis: ensureUserDoc(uid, emailString) vagy ensureUserDoc(uid, patchObj)
========================= */
export async function ensureUserDoc(uid, emailOrPatch = {}){
  const patch = (typeof emailOrPatch === "string")
    ? { email: String(emailOrPatch || "").trim() }
    : (emailOrPatch || {});

  const r = fs.doc(db, "users", uid);
  const snap = await fs.getDoc(r);

  const base = {
    createdAt: fs.serverTimestamp(),
    updatedAt: fs.serverTimestamp(),
    role: "user",
    status: "active",
    lang: "hu",

    paid: false,
    activated: false,
    payment: { provider:"", sid:"", status:"none" },

    // chat OP2
    chatEnabled: false,
    chatTrialUntil: null
  };

  if(!snap.exists()){
    await fs.setDoc(r, { ...base, ...patch }, { merge:true });
    return { ...base, ...patch };
  }

  const d = snap.data() || {};
  const fix = {};
  if(typeof d.role !== "string") fix.role = "user";
  if(typeof d.status !== "string") fix.status = "active";
  if(typeof d.lang !== "string") fix.lang = "hu";

  if(typeof d.paid !== "boolean") fix.paid = false;
  if(typeof d.activated !== "boolean") fix.activated = false;
  if(!("payment" in d)) fix.payment = { provider:"", sid:"", status:"none" };

  if(typeof d.chatEnabled !== "boolean") fix.chatEnabled = false;
  if(!("chatTrialUntil" in d)) fix.chatTrialUntil = null;

  const up = { ...fix, ...patch, updatedAt: fs.serverTimestamp() };
  if(Object.keys(up).length){
    await fs.setDoc(r, up, { merge:true }).catch(()=>{});
  }
  return { ...d, ...up };
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
  else if(typeof t === "string" && t) ms = new Date(t).getTime();

  return !!ms && ms > Date.now();
}

/* =========================
   PAYMENTS (admin használja)
   purchases/{sid}
========================= */
export async function listRecentPurchases(limitN=50){
  const q = fs.query(
    fs.collection(db, "purchases"),
    fs.orderBy("createdAt", "desc"),
    fs.limit(clamp(limitN, 1, 200))
  );
  const snap = await fs.getDocs(q);
  return snap.docs.map(d => ({ id:d.id, ...(d.data()||{}), sid:(d.data()?.sid || d.id) }));
}

/**
 * Aktiválás: kiválasztott purchase → rárakjuk a userre a fizetett státuszt és planId-t
 * majd a purchases/{sid} status = activated
 */
export async function activateUserFromPurchase({ uid, sid }){
  if(!uid) throw new Error("Missing uid");
  if(!sid) throw new Error("Missing sid");

  const pr = fs.doc(db, "purchases", sid);
  const ps = await fs.getDoc(pr);
  if(!ps.exists()) throw new Error("Purchase nem található: " + sid);

  const p = ps.data() || {};
  const planId = String(p.planId || "start_v1").trim() || "start_v1";

  await fs.setDoc(fs.doc(db, "users", uid), {
    paid: true,
    activated: true,
    planId,
    payment: {
      provider: String(p.provider || "stripe"),
      sid,
      status: String(p.status || "activated")
    },
    updatedAt: fs.serverTimestamp()
  }, { merge:true });

  await fs.setDoc(pr, {
    status: "activated",
    activatedAt: fs.serverTimestamp(),
    uid
  }, { merge:true });

  return { ok:true, planId };
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
