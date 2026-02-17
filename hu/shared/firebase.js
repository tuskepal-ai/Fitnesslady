// /shared/firebase.js
// Firebase modular (ESM) – éles, statikus hoston (Hostpoint) működik

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- A TE FIREBASE KONFIGOD (amit küldtél) ---
const firebaseConfig = {
  apiKey: "AIzaSyBl2MzyiRzgCzeg-eEWNHkc9Vxx-PgawfU",
  authDomain: "fitneady-15fd0.firebaseapp.com",
  projectId: "fitneady-15fd0",
  storageBucket: "fitneady-15fd0.firebasestorage.app",
  messagingSenderId: "480597492603",
  appId: "1:480597492603:web:2ba6c266c662b4c79e33de",
  measurementId: "G-MH1YK9C2YF"
};

// Initialize
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Firestore helper namespace, hogy a hívások szépek legyenek
export const fs = {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
};

// --- APP HELPERS ---
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function logout() {
  await signOut(auth);
}

export function toLogin(lang = "hu") {
  // Egységes login útvonal
  // (ha később lesz /de/login/, itt lehet bővíteni)
  if (lang === "de") {
    location.href = "/hu/login/"; // most még HU-ra viszünk fixen
    return;
  }
  location.href = "/hu/login/";
}

export function escapeHtml(input) {
  const s = String(input ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function safeJsonParse(str, fallback = null) {
  try {
    if (str === null || str === undefined) return fallback;
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export function clamp(n, min, max) {
  const x = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, x));
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDate(iso) {
  if (!iso) return "—";
  // ISO (YYYY-MM-DD) vagy timestamp string esetén
  try {
    if (typeof iso === "string" && iso.includes("T")) {
      return new Date(iso).toLocaleDateString("hu-HU");
    }
    if (typeof iso === "string" && iso.length >= 10) {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("hu-HU");
    }
    return String(iso);
  } catch {
    return String(iso);
  }
}

export function daysBetween(isoA, isoB) {
  // isoA / isoB: "YYYY-MM-DD"
  try {
    const a = new Date(String(isoA).slice(0, 10) + "T00:00:00Z").getTime();
    const b = new Date(String(isoB).slice(0, 10) + "T00:00:00Z").getTime();
    const diff = Math.floor((b - a) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return 0;
  }
}
