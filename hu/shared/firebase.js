// FILE: /hu/shared/firebase.js
// Firebase v9 modular (CDN) — shared helpers HU (éles)

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/**
 * ADMIN EMAIL-ek (opcionális)
 * Ha ide felveszed a saját emailed, admin oldalra role nélkül is be tudsz menni.
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

// Firestore namespace export (kompatibilitás)
export const fs = {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, orderBy, limit, where,
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

// ---------- Navigation ----------
export function toLogin(lang="hu"){
  const l = (lang === "de") ? "de" : "hu";
  window.location.href = `${BASE_PREFIX}/${l}/login/`;
}
export function toApp(lang="hu"){
  const l = (lang === "de") ? "de" : "hu";
  window.location.href = `${BASE_PREFIX}/${l}/app/`;
}
/**
 * FONTOS: admin mindig HU legyen (kérésed szerint)
 */
export function toAdmin(){
  window.location.href = `${BASE_PREFIX}/hu/admin/`;
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

// ---------- Role / user bootstrap ----------
export function isAdminEmail(email){
  const e = String(email || "").trim().toLowerCase();
  return ADMIN_EMAILS.map(x=>String(x).trim().toLowerCase()).includes(e);
}

/**
 * EGYSÉGES USER SÉMA:
 * - dietText, motivationText mezők (ezeket olvassa az app)
 * - planId, role, status, lifetimeAccess, cycleStart/cycleEnd
 */
export async function ensureUserDoc(uid, email){
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  const base = {
    email: email || "",
    displayName: "",
    lang: "hu",
    role: "user",
    status: "active",

    planId: "start_v1",
    goal: "Formálás",
    level: 2,

    lifetimeAccess: true,
    cycleStart: null,
    cycleEnd: null,

    dietText: "",
    motivationText: "",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if(!snap.exists()){
    await setDoc(ref, base, { merge: true });
    return base;
  }

  const data = snap.data() || {};
  const patch = {};
  if(email && data.email !== email) patch.email = email;
  if(!("dietText" in data) && ("diet" in data) && typeof data.diet === "string") patch.dietText = data.diet;
  if(!("motivationText" in data) && ("motivation" in data) && typeof data.motivation === "string") patch.motivationText = data.motivation;
  if(!("status" in data)) patch.status = "active";
  if(!("planId" in data)) patch.planId = "start_v1";
  if(!("lifetimeAccess" in data)) patch.lifetimeAccess = true;
  if(!("goal" in data)) patch.goal = "Formálás";
  if(!("level" in data)) patch.level = 2;
  if(Object.keys(patch).length){
    patch.updatedAt = serverTimestamp();
    await setDoc(ref, patch, { merge:true });
  }
  return { ...base, ...data, ...patch };
}

export async function getUserRole(uid){
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if(!snap.exists()) return null;
  const role = String((snap.data()?.role || "")).toLowerCase();
  return role || null;
}

/**
 * Admin mentéshez: teljes user profil mentése
 */
export async function adminSaveUser(uid, payload){
  const ref = doc(db, "users", uid);
  await setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge:true });
}

/**
 * Admin: user keresés email alapján
 */
export async function findUserByEmail(email){
  const e = String(email || "").trim().toLowerCase();
  if(!e) return null;

  const qy = query(collection(db, "users"), where("email","==", e), limit(1));
  const snaps = await getDocs(qy);
  if(snaps.empty) return null;

  const docSnap = snaps.docs[0];
  return { uid: docSnap.id, data: docSnap.data() || {} };
}
