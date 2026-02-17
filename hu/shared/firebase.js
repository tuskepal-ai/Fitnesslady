// ./hu/shared/firebase.js
// ÉLES: Firebase CDN (nincs bundler), Hostpoint + GitHub Pages kompatibilis
// Fontos: Analytics-t direkt NEM inicializálunk (mobilon / webview-ban gyakran dob hibát).

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- Safe prefix (GitHub Pages: /Fitnesslady, Hostpoint: "") ---
const HOST = (typeof location !== "undefined" && location.hostname) ? String(location.hostname) : "";
export const BASE_PREFIX = HOST.includes("github.io") ? "/Fitnesslady" : "";

// Firebase config (a tied)
const firebaseConfig = {
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

// Firestore helper export “fs” néven (ahogy a vevő oldal használja)
export const fs = {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
};

// ---- helpers ----
export function onAuth(cb){
  return onAuthStateChanged(auth, cb);
}

export async function logout(){
  await signOut(auth);
}

export function toLogin(lang="hu"){
  const l = (lang === "de") ? "de" : "hu";
  // /hu/login/ (ha nálad máshogy van, itt módosítjuk)
  location.href = `${BASE_PREFIX}/${l}/login/`;
}

export function safeJsonParse(str, fallback){
  try{
    if(str === null || str === undefined) return fallback;
    return JSON.parse(str);
  }catch{
    return fallback;
  }
}

export function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

export const todayISO = () => new Date().toISOString().slice(0,10);
export const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
export const daysBetween = (a,b)=>Math.round((new Date(b)-new Date(a))/86400000);

export function fmtDate(iso){
  if(!iso) return "—";
  const d = new Date(iso+"T00:00:00");
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${yy}.${mm}.${dd}`;
}
