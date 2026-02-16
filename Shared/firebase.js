// shared/firebase.js
// ÉLES Firebase modul: Auth + Firestore + GitHub Pages BASE_PREFIX

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ✅ A te Firebase configod
export const firebaseConfig = {
  apiKey: "AIzaSyBl2MzyiRzgCzeg-eEWNHkc9Vxx-PgawfU",
  authDomain: "fitneady-15fd0.firebaseapp.com",
  projectId: "fitneady-15fd0",
  storageBucket: "fitneady-15fd0.firebasestorage.app",
  messagingSenderId: "480597492603",
  appId: "1:480597492603:web:2ba6c266c662b4c79e33de",
  measurementId: "G-MH1YK9C2YF"
};

// GitHub Pages prefix
export const BASE_PREFIX = (location.hostname.endsWith("github.io")) ? "/Fitnesslady" : "";

// Shared helpers
export function safeJsonParse(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

export function todayISO() {
  return new Date().toISOString().slice(0,10);
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function daysBetween(aISO, bISO) {
  return Math.round((new Date(bISO) - new Date(aISO)) / 86400000);
}

export function fmtDate(iso){
  if(!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${yy}.${mm}.${dd}`;
}

// Firebase init (singletons)
export const fbApp = initializeApp(firebaseConfig);
try { getAnalytics(fbApp); } catch(_) {}
export const auth = getAuth(fbApp);
export const db = getFirestore(fbApp);

// Firestore helpers exports
export const fs = {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, query, orderBy, limit, where
};

// Common auth helpers
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function logout() {
  await signOut(auth);
}

// Redirect helpers
export function pathJoin(...parts){
  return parts.join("/").replace(/\/+/g, "/");
}

export function toLogin(lang = "hu") {
  // ha van külön /hu/login/ és /de/login/
  const url = pathJoin(BASE_PREFIX, `/${lang}/login/`);
  location.href = url;
}

export function toApp() {
  const url = pathJoin(BASE_PREFIX, "/app/");
  location.href = url;
}

export function toAdmin() {
  const url = pathJoin(BASE_PREFIX, "/admin/");
  location.href = url;
}
