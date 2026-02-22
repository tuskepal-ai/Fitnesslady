// FILE: /hu/shared/firebase.js
// Firebase v9 modular (CDN) — shared helpers
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, orderBy, limit, where,
  addDoc, onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/**
 * Admin email(ek)
 */
export const ADMIN_EMAILS = [
  "tuskepal@gmail.com",
];

export const BASE_PREFIX = ""; // GitHub Pages root

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
export const db = getFirestore(app);

// Firestore namespace export
export const fs = {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, orderBy, limit, where,
  addDoc, onSnapshot,
  serverTimestamp
};

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
    return d.toLocaleDateString("hu-HU", { year:"numeric", month:"2-digit", day:"2-digit" });
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
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

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

      introCard: { title:"", text:"", video:"" },
      welcomeCard: { title:"", text:"", video:"" }, // kompatibilitás
      motivationCard: {
        title: "A rendszer szabadság.",
        text: "Nem kell tökéletesnek lenned. Elég, ha következetes vagy."
      },

      // (tervezés) profilkép
      photoURL: "",

      // Payment flags (admin a source of truth)
      paid: false,
      activated: false,
      payment: {
        provider: "",
        sid: "",
        status: "none" // none | pending_activation | activated
      },

      // Trackerek napra bontva
      trackersByDay: {},

      // Technika lista (kompatibilitás: lehet tömb vagy {items:[]})
      techVault: { items: [] },

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(ref, initial, { merge: true });
    return initial;
  }else{
    const data = snap.data() || {};
    const patch = {};

    if(email && data.email !== email){
      patch.email = email;
      patch.updatedAt = serverTimestamp();
    }
    if(!("name" in data)) patch.name = "";
    if(!data.motivationCard){
      patch.motivationCard = {
        title: "A rendszer szabadság.",
        text: "Nem kell tökéletesnek lenned. Elég, ha következetes vagy."
      };
    }
    if(!data.introCard && !data.welcomeCard){
      patch.welcomeCard = { title:"", text:"", video:"" };
    }
    if(!data.dietPlan) patch.dietPlan = {};
    if(!data.trackersByDay) patch.trackersByDay = {};
    if(!data.techVault) patch.techVault = { items: [] };
    if(typeof data.paid !== "boolean") patch.paid = false;
    if(typeof data.activated !== "boolean") patch.activated = false;
    if(!data.payment) patch.payment = { provider:"", sid:"", status:"none" };
    if(!("photoURL" in data)) patch.photoURL = "";

    if(Object.keys(patch).length){
      await setDoc(ref, patch, { merge:true });
    }
    return (await getDoc(ref)).data();
  }
}

export async function getUserRole(uid){
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if(!snap.exists()) return null;
  const role = String((snap.data()?.role || "")).toLowerCase();
  return role || null;
}

/**
 * Purchases / Stripe “Payment Link” flow (admin activation)
 *
 * Collection: purchases
 * Doc id: sid (Checkout Session ID)
 */
export async function upsertPurchaseFromStripe({ sid, planId, email, uid }){
  const _sid = String(sid || "").trim();
  if(!_sid) throw new Error("Missing sid");
  const _planId = normalizePlanId(planId);
  const _email = normalizeEmail(email);

  const pref = doc(db, "purchases", _sid);
  await setDoc(pref, {
    provider: "stripe",
    sid: _sid,
    planId: _planId,
    email: _email,
    uid: uid || "",
    status: "pending_activation", // pending_activation | activated | cancelled
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge:true });

  return _sid;
}

export async function activateUserFromPurchase({ uid, sid }){
  const _uid = String(uid || "").trim();
  const _sid = String(sid || "").trim();
  if(!_uid) throw new Error("Missing uid");
  if(!_sid) throw new Error("Missing sid");

  const pref = doc(db, "purchases", _sid);
  const ps = await getDoc(pref);
  if(!ps.exists()) throw new Error("Purchase not found");

  const pd = ps.data() || {};
  const planId = normalizePlanId(pd.planId || "start_v1");
  const email = normalizeEmail(pd.email || "");

  // 1) user update
  await setDoc(doc(db, "users", _uid), {
    email: email || undefined,
    planId,
    status: "active",
    paid: true,
    activated: true,
    payment: {
      provider: "stripe",
      sid: _sid,
      status: "activated"
    },
    updatedAt: serverTimestamp()
  }, { merge:true });

  // 2) purchase update
  await setDoc(pref, {
    uid: _uid,
    status: "activated",
    activatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge:true });

  return { uid:_uid, sid:_sid, planId };
}

export async function listRecentPurchases(max=40){
  const m = clamp(parseInt(max,10) || 40, 1, 120);
  const col = collection(db, "purchases");
  const snap = await getDocs(query(col, orderBy("createdAt","desc"), limit(m)));
  return snap.docs.map(d => ({ id:d.id, ...(d.data()||{}) }));
}
