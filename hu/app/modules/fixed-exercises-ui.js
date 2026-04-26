import { db, fs } from "../../shared/firebase.js";
import { FIXED_EXERCISE_IMAGE_URLS } from "../../shared/fixed-exercises-data.js";

const IMAGE_MAP = {
  ...FIXED_EXERCISE_IMAGE_URLS,
  "guggolas": "/hu/app/assets/exercises/guggolas.png",
  "fekvotamasz": "/hu/app/assets/exercises/fekvotamasz.png",
  "plank": "/hu/app/assets/exercises/plank.png",
  "kitores": "/hu/app/assets/exercises/kitores.png",
  "mountain-climber": "/hu/app/assets/exercises/mountain-climber.png",
  "mountainclimber": "/hu/app/assets/exercises/mountain-climber.png",
  "hegymaszo": "/hu/app/assets/exercises/mountain-climber.png",
  "burpee": "/hu/app/assets/exercises/mountain-climber.png",
  "csipoemeles": "/hu/app/assets/exercises/csipoemeles.png",
  "glute-bridge": "/hu/app/assets/exercises/csipoemeles.png",
  "csipo-emeles": "/hu/app/assets/exercises/csipoemeles.png",
  "glutebridge": "/hu/app/assets/exercises/csipoemeles.png",
  "oldalemeles": "/hu/app/assets/exercises/oldalemeles.png",
  "biciklis-haspres": "/hu/app/assets/exercises/biciklis-haspres.png",
  "jumping-jack": "/hu/app/assets/exercises/terpesz-zar.png",
  "jumpingjack": "/hu/app/assets/exercises/terpesz-zar.png",
  "labemeles-fekve": "/hu/app/assets/exercises/labemeles-fekve.png",
  "vadli-emeles": "/hu/app/assets/exercises/vadli-emeles.png",
  "oldalso-terdemeles": "/hu/app/assets/exercises/oldalso-terdemeles.png",
  "szek-tamaszos-tricepsz": "/hu/app/assets/exercises/szek-tricepsz.png",
  "szek-tricepsz": "/hu/app/assets/exercises/szek-tricepsz.png",
  "vall-korzes": "/hu/app/assets/exercises/vallkorzes.png",
  "vallkorzes": "/hu/app/assets/exercises/vallkorzes.png",
  "konnyu-ulesbol-felallas": "/hu/app/assets/exercises/konnyu-ulesbol-felallas.png",
};

const CANONICAL_EXERCISE_IDS = new Set(Object.keys(FIXED_EXERCISE_IMAGE_URLS));
const CANONICAL_EXERCISE_ALIASES = {
  "csipo-emeles": "csipoemeles",
  "csipo-emeles-fekve": "csipoemeles",
  "glute-bridge": "csipoemeles",
  glutebridge: "csipoemeles",
  mountainclimber: "mountain-climber",
  hegymaszo: "mountain-climber",
  "szek-tricepsz": "szek-tamaszos-tricepsz",
  vallkorzes: "vall-korzes",
  jumpingjack: "jumping-jack",
  "terpesz-zar": "jumping-jack",
};

const state = {
  uid: "",
  items: [],
  timers: new Map(),
  unsub: null
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCanonicalExerciseId(itemOrId) {
  const item = typeof itemOrId === "object" && itemOrId ? itemOrId : { id: itemOrId };
  const candidates = [
    item.id,
    item.exerciseId,
    item.name,
    item.nev
  ];

  for (const candidate of candidates) {
    const raw = String(candidate || "").trim();
    if (!raw) continue;
    if (CANONICAL_EXERCISE_IDS.has(raw)) return raw;

    const normalized = slugify(raw);
    if (CANONICAL_EXERCISE_IDS.has(normalized)) return normalized;
    if (CANONICAL_EXERCISE_ALIASES[normalized]) return CANONICAL_EXERCISE_ALIASES[normalized];
  }

  return "";
}

function isDataImageUrl(value) {
  return String(value || "").trim().startsWith("data:image");
}

function injectStyles() {
  if (document.getElementById("fixed-exercises-ui-inline-style")) return;

  const style = document.createElement("style");
  style.id = "fixed-exercises-ui-inline-style";
  style.textContent = `
    .fxu-section{
      margin-top:14px;
      padding:18px;
      border-radius:22px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(18,12,26,.55);
      box-shadow:0 16px 40px rgba(0,0,0,.30);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }

    .fxu-top{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom:14px;
    }

    .fxu-kicker{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:6px 10px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.05);
      color:rgba(255,255,255,.82);
      font-size:12px;
      font-weight:900;
      margin-bottom:10px;
    }

    .fxu-title{
      margin:0 0 6px;
      font-family:ui-serif, Georgia, serif;
      font-size:32px;
      line-height:1.05;
      letter-spacing:-.2px;
      color:rgba(255,255,255,.96);
    }

    .fxu-sub{
      margin:0;
      color:rgba(255,255,255,.70);
      font-size:13.5px;
      line-height:1.55;
    }

    .fxu-refresh{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:9px 14px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.06);
      color:#ff76e2;
      font-weight:900;
      cursor:pointer;
      user-select:none;
    }

    .fxu-empty{
      padding:18px;
      border-radius:18px;
      border:1px dashed rgba(255,255,255,.12);
      background:rgba(255,255,255,.03);
      color:rgba(255,255,255,.66);
      text-align:center;
    }

    .fxu-track{
      display:flex;
      gap:18px;
      overflow-x:auto;
      scroll-snap-type:x proximity;
      padding:6px 2px 4px;
      -webkit-overflow-scrolling:touch;
    }
    .fxu-track::-webkit-scrollbar{ height:8px; }
    .fxu-track::-webkit-scrollbar-thumb{
      background:rgba(255,255,255,.12);
      border-radius:999px;
    }

    .fxu-card{
      flex:0 0 min(320px, 78vw);
      scroll-snap-align:center;
      border-radius:28px;
      border:1px solid rgba(255,255,255,.10);
      background:
        radial-gradient(900px 260px at 18% 0%, rgba(255,79,216,.14), transparent 55%),
        radial-gradient(900px 260px at 86% 16%, rgba(177,76,255,.10), transparent 60%),
        rgba(10,8,16,.92);
      box-shadow:
        0 24px 80px rgba(0,0,0,.48),
        0 10px 28px rgba(255,79,216,.10);
      padding:18px;
      position:relative;
      overflow:hidden;
    }

    .fxu-card::after{
      content:"";
      position:absolute;
      inset:auto 18px 12px 18px;
      height:18px;
      border-radius:999px;
      background:radial-gradient(circle, rgba(255,79,216,.20), transparent 70%);
      filter:blur(12px);
      pointer-events:none;
    }

    .fxu-image-wrap{
      position:relative;
      width:100%;
      height:210px;
      border-radius:26px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.10);
      background:
        linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02)),
        rgba(255,255,255,.03);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.12),
        0 16px 34px rgba(0,0,0,.28);
      margin-bottom:16px;
    }

    .fxu-image{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
      background:#120e18;
    }

    .fxu-image-fallback{
      width:100%;
      height:100%;
      display:flex;
      align-items:flex-end;
      justify-content:flex-start;
      padding:16px;
      color:#fff;
      font-weight:900;
      font-size:14px;
      line-height:1.3;
      background:
        radial-gradient(280px 120px at 20% 0%, rgba(255,255,255,.12), transparent 60%),
        linear-gradient(135deg, rgba(255,79,216,.18), rgba(177,76,255,.12)),
        rgba(255,255,255,.02);
    }

    .fxu-fl{
      position:absolute;
      top:12px;
      right:12px;
      width:62px;
      height:62px;
      border-radius:999px;
      background:
        radial-gradient(circle at 50% 50%, rgba(18,12,26,.96) 0 54%, transparent 56% 100%),
        conic-gradient(from 180deg, #ff4fd8, #ff8b6f, #b14cff, #ff4fd8);
      display:flex;
      align-items:center;
      justify-content:center;
      color:#fff;
      font-weight:900;
      font-size:16px;
      border:1px solid rgba(255,255,255,.16);
      box-shadow:0 10px 30px rgba(0,0,0,.35);
      z-index:2;
    }

    .fxu-name{
      margin:0 0 8px;
      font-size:24px;
      line-height:1.08;
      color:rgba(255,255,255,.97);
      font-weight:900;
    }

    .fxu-badge{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:32px;
      padding:0 12px;
      border-radius:999px;
      background:rgba(255,79,216,.14);
      border:1px solid rgba(255,79,216,.24);
      color:#ff9be9;
      font-size:12px;
      font-weight:900;
      margin-bottom:14px;
    }

    .fxu-desc{
      color:rgba(255,255,255,.76);
      font-size:14px;
      line-height:1.6;
      min-height:64px;
      margin-bottom:14px;
    }

    .fxu-meta{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-bottom:18px;
    }

    .fxu-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:6px;
      min-height:34px;
      padding:0 12px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.05);
      color:rgba(255,255,255,.84);
      font-size:12px;
      font-weight:900;
    }

    .fxu-timer{
      width:154px;
      height:154px;
      margin:0 auto 18px;
      border-radius:999px;
      display:flex;
      align-items:center;
      justify-content:center;
      --fxu-progress:360deg;
      background:
        radial-gradient(circle at center, rgba(6,7,14,.98) 0 44%, transparent 46% 100%),
        conic-gradient(from -90deg,
          rgba(255,79,216,.98) 0deg,
          rgba(177,76,255,.98) var(--fxu-progress),
          rgba(255,255,255,.16) var(--fxu-progress),
          rgba(255,255,255,.16) 360deg
        );
      box-shadow:
        0 0 40px rgba(255,79,216,.16),
        inset 0 0 22px rgba(255,255,255,.05);
      position:relative;
    }

    .fxu-timer.is-running{
      box-shadow:
        0 0 48px rgba(255,79,216,.24),
        0 0 22px rgba(177,76,255,.14),
        inset 0 0 22px rgba(255,255,255,.05);
    }

    .fxu-timer.is-done{
      --fxu-progress:0deg;
      opacity:.82;
    }

    .fxu-timer-inner{
      width:110px;
      height:110px;
      border-radius:999px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      background:#04060d;
      border:1px solid rgba(255,255,255,.08);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
      text-align:center;
    }

    .fxu-time{
      font-size:24px;
      line-height:1;
      font-weight:900;
      color:#fff;
      margin-bottom:6px;
    }

    .fxu-phase{
      font-size:11px;
      color:rgba(255,255,255,.62);
      font-weight:800;
      letter-spacing:.2px;
    }

    .fxu-actions,
    .fxu-actions-bottom{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }

    .fxu-actions-bottom{
      margin-top:10px;
    }

    .fxu-btn{
      min-height:46px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.06);
      color:#fff;
      font:inherit;
      font-weight:900;
      cursor:pointer;
      box-shadow:0 10px 24px rgba(0,0,0,.22);
    }

    .fxu-btn.primary{
      background:linear-gradient(135deg, #ff4fd8, #b14cff);
      color:#160915;
      border-color:transparent;
    }

    .fxu-btn:disabled{
      opacity:.55;
      cursor:not-allowed;
      box-shadow:none;
    }

    .fxu-detail{
      display:none;
      margin-top:12px;
      padding:14px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      color:rgba(255,255,255,.76);
      font-size:13px;
      line-height:1.55;
    }

    .fxu-detail.is-open{
      display:block;
    }
  `;
  document.head.appendChild(style);
}

function ensureRoot() {
  let root = document.getElementById("fixedExercisesRoot");
  if (root) return root;

  const technika = document.getElementById("technika");
  root = document.createElement("section");
  root.id = "fixedExercisesRoot";
  root.className = "fxu-section";

  if (technika && technika.parentNode) {
    technika.parentNode.insertBefore(root, technika);
  } else {
    document.querySelector("main")?.appendChild(root);
  }

  return root;
}

function getExerciseKey(item) {
  return getCanonicalExerciseId(item) || String(item?.id || "").trim();
}

function getMappedImage(item) {
  const exerciseId = String(item?.exerciseId || "").trim();
  if (exerciseId && IMAGE_MAP[exerciseId]) return IMAGE_MAP[exerciseId];
  if (exerciseId) {
    const normalizedExerciseId = slugify(exerciseId);
    if (normalizedExerciseId && IMAGE_MAP[normalizedExerciseId]) return IMAGE_MAP[normalizedExerciseId];
  }

  const docId = String(item?.id || "").trim();
  if (docId && IMAGE_MAP[docId]) return IMAGE_MAP[docId];
  if (docId) {
    const normalizedDocId = slugify(docId);
    if (normalizedDocId && IMAGE_MAP[normalizedDocId]) return IMAGE_MAP[normalizedDocId];
  }

  const nameSlug = slugify(item?.name || item?.nev || "");
  if (nameSlug && IMAGE_MAP[nameSlug]) return IMAGE_MAP[nameSlug];

  return "";
}

function getFirestoreImage(item) {
  const v = String(item?.imageUrl || "").trim();
  if (!v || isDataImageUrl(v)) return "";
  return v;
}

function getDisplayImage(item) {
  return getMappedImage(item) || getFirestoreImage(item) || "";
}

function formatTime(totalSec) {
  const safe = Math.max(0, Number(totalSec || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getTimerState(id, item) {
  if (!state.timers.has(id)) {
    const workSec = Number(item.workSec || item.munka_mp || 0);
    state.timers.set(id, {
      phase: "munkaidő",
      isRunning: false,
      isPaused: false,
      duration: workSec,
      remaining: workSec,
      intervalId: null
    });
  }
  return state.timers.get(id);
}

function getTimerDuration(timer, item) {
  const workSec = Number(item.workSec || item.munka_mp || 0);
  const restSec = Number(item.restSec || item.piheno_mp || 0);
  const phase = String(timer?.phase || "").toLowerCase();
  const duration = phase.includes("pihen") ? restSec : (timer?.duration || workSec);
  return Math.max(1, Number(duration || workSec || 1));
}

function getTimerProgressDeg(timer, item) {
  const duration = getTimerDuration(timer, item);
  const remaining = Math.max(0, Math.min(duration, Number(timer?.remaining || 0)));
  return Math.round((remaining / duration) * 360);
}

function stopTimer(id) {
  const timer = state.timers.get(id);
  if (!timer) return;
  if (timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
  timer.isRunning = false;
  timer.isPaused = false;
}

function resetTimer(id, item) {
  stopTimer(id);
  const timer = getTimerState(id, item);
  timer.phase = "munkaidő";
  timer.duration = Number(item.workSec || item.munka_mp || 0);
  timer.remaining = timer.duration;
  render();
}

function pauseTimer(id) {
  const timer = state.timers.get(id);
  if (!timer) return;
  if (!timer.isRunning) return;

  if (timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
  timer.isRunning = false;
  timer.isPaused = true;
  render();
}

function vibratePhoneOnFinish() {
  try {
    if (navigator?.vibrate) navigator.vibrate([200, 120, 260]);
  } catch {}
}

function startTimer(id, item) {
  const timer = getTimerState(id, item);
  if (timer.isRunning) return;

  const workSec = Number(item.workSec || item.munka_mp || 0);

  if (timer.remaining <= 0) {
    timer.phase = "munkaidő";
    timer.duration = workSec;
    timer.remaining = workSec;
  }

  timer.isRunning = true;
  timer.isPaused = false;

  timer.intervalId = setInterval(() => {
    timer.remaining -= 1;

    if (timer.remaining <= 0) {
      stopTimer(id);
      vibratePhoneOnFinish();
      timer.remaining = 0;
      render();
      return;
    }

    render();
  }, 1000);

  render();
}

function buildCard(item) {
  const id = getExerciseKey(item);
  const displayImage = getDisplayImage(item);
  const mappedImage = getMappedImage(item);
  const firestoreImage = getFirestoreImage(item);

  const timer = getTimerState(id, item);

  const name = item.name || item.nev || "Fix edzés";
  const desc = item.desc || item.leiras || "";
  const guide = item.guide || item.instructions || item.details || item.utmutato || "";
  const category = item.category || item.kategoria || "Általános";
  const rounds = Number(item.rounds || item.korok || 1);
  const workSec = Number(item.workSec || item.munka_mp || 0);
  const restSec = Number(item.restSec || item.piheno_mp || 0);
  const repsText = item.repsText || item.ismetles_szoveg || "";
  const difficulty = item.difficulty || item.nehezseg || "";
  const type = item.type || item.tipus || "";
  const progressDeg = getTimerProgressDeg(timer, item);
  const timerClasses = [
    "fxu-timer",
    timer.isRunning ? "is-running" : "",
    !timer.isRunning && !timer.isPaused && Number(timer.remaining || 0) <= 0 ? "is-done" : ""
  ].filter(Boolean).join(" ");

  return `
    <article class="fxu-card">
      <div class="fxu-image-wrap">
        <div class="fxu-fl">FL</div>
        ${
          displayImage
            ? `<img
                class="fxu-image"
                src="${escapeHtml(displayImage)}"
                alt="${escapeHtml(name)}"
                data-fxu-img="${escapeHtml(id)}"
                data-primary-src="${escapeHtml(mappedImage || "")}"
                data-secondary-src="${escapeHtml(firestoreImage || "")}"
              >`
            : `<div class="fxu-image-fallback">${escapeHtml(name)}</div>`
        }
      </div>

      <h3 class="fxu-name">${escapeHtml(name)}</h3>
      <div class="fxu-badge">${escapeHtml(category)}</div>

      <div class="fxu-desc">${escapeHtml(desc)}</div>

      <div class="fxu-meta">
        <span class="fxu-chip">⏱ ${workSec} mp munka</span>
        <span class="fxu-chip">◔ ${restSec} mp pihenő</span>
        <span class="fxu-chip">↻ ${rounds} kör</span>
      </div>

      <div class="${timerClasses}" style="--fxu-progress:${progressDeg}deg;">
        <div class="fxu-timer-inner">
          <div class="fxu-time">${formatTime(timer.remaining)}</div>
          <div class="fxu-phase">${escapeHtml(timer.phase)}</div>
        </div>
      </div>

      <div class="fxu-actions">
        <button class="fxu-btn" type="button" data-fxu-detail-btn="${escapeHtml(id)}">Részletek</button>
        <button class="fxu-btn primary" type="button" data-fxu-start="${escapeHtml(id)}">
          ${timer.isRunning ? "Fut..." : (timer.isPaused ? "Folytatás" : "Indítás")}
        </button>
      </div>

      <div class="fxu-actions-bottom">
        <button class="fxu-btn" type="button" data-fxu-pause="${escapeHtml(id)}" ${timer.isRunning ? "" : "disabled"}>Pause</button>
        <button class="fxu-btn" type="button" data-fxu-reset="${escapeHtml(id)}">Reset</button>
      </div>

      <div class="fxu-detail" id="fxu-detail-${escapeHtml(id)}">
        <strong style="display:block; margin-bottom:8px;">${escapeHtml(name)}</strong>
        <div style="margin-bottom:8px;">${escapeHtml(desc)}</div>
        ${
          guide
            ? `<div style="margin:10px 0 8px; font-weight:900; color:#ff9be9;">Helyes kivitelezés</div>
               <div style="margin-bottom:10px;">${escapeHtml(guide)}</div>`
            : ""
        }
        <div>Munkaidő: ${workSec} mp</div>
        <div>Pihenőidő: ${restSec} mp</div>
        <div>Körök: ${rounds}</div>
        ${repsText ? `<div>Ismétlés: ${escapeHtml(repsText)}</div>` : ""}
        ${difficulty ? `<div>Nehézség: ${escapeHtml(difficulty)}</div>` : ""}
        ${type ? `<div>Típus: ${escapeHtml(type)}</div>` : ""}
      </div>
    </article>
  `;
}

function bindCardEvents() {
  document.querySelectorAll("[data-fxu-start]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fxu-start");
      const item = state.items.find(x => getExerciseKey(x) === id);
      if (!item) return;
      startTimer(id, item);
    });
  });

  document.querySelectorAll("[data-fxu-pause]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fxu-pause");
      pauseTimer(id);
    });
  });

  document.querySelectorAll("[data-fxu-reset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fxu-reset");
      const item = state.items.find(x => getExerciseKey(x) === id);
      if (!item) return;
      resetTimer(id, item);
    });
  });

  document.querySelectorAll("[data-fxu-detail-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fxu-detail-btn");
      const panel = document.getElementById(`fxu-detail-${id}`);
      if (!panel) return;
      panel.classList.toggle("is-open");
    });
  });

  document.querySelectorAll("[data-fxu-img]").forEach((img) => {
    img.addEventListener("error", () => {
      const primary = String(img.dataset.primarySrc || "").trim();
      const secondary = String(img.dataset.secondarySrc || "").trim();
      const current = String(img.getAttribute("src") || "").trim();

      if (primary && current !== primary) {
        img.setAttribute("src", primary);
        return;
      }

      if (secondary && current !== secondary) {
        img.setAttribute("src", secondary);
        return;
      }

      const wrap = img.closest(".fxu-image-wrap");
      if (!wrap) return;
      wrap.innerHTML = `
        <div class="fxu-fl">FL</div>
        <div class="fxu-image-fallback">Nincs kép</div>
      `;
    });
  });

  document.getElementById("fxuRefreshBtn")?.addEventListener("click", async () => {
    await loadItems();
    render();
  });
}

function normalizeItems(items) {
  const uniqueItems = new Map();

  for (const item of items) {
    if (item?.active === false || item?.archived === true) continue;

    const id = getExerciseKey(item);
    if (!id) continue;

    const normalizedItem = { ...item, id };
    if (!getDisplayImage(normalizedItem)) continue;
    if (!uniqueItems.has(id)) uniqueItems.set(id, normalizedItem);
  }

  state.items = [...uniqueItems.values()].sort((a, b) => {
    const ao = Number(a.sortOrder || a.sorrend || 0);
    const bo = Number(b.sortOrder || b.sorrend || 0);
    if (ao !== bo) return ao - bo;
    return String(a.name || a.nev || "").localeCompare(String(b.name || b.nev || ""), "hu");
  });

  state.items.forEach((item) => {
    const id = getExerciseKey(item);
    getTimerState(id, item);
  });
}

function render() {
  const root = ensureRoot();

  root.innerHTML = `
    <div class="fxu-top">
      <div>
        <div class="fxu-kicker">• Fix edzések</div>
        <h2 class="fxu-title">Saját fix edzéseid</h2>
        <p class="fxu-sub">Az admin által hozzád rendelt képes edzések. Érintésre előtérbe kerülnek.</p>
      </div>
      <button class="fxu-refresh" id="fxuRefreshBtn" type="button">Frissítés</button>
    </div>

    ${
      state.items.length
        ? `<div class="fxu-track">${state.items.map(buildCard).join("")}</div>`
        : `<div class="fxu-empty">Ehhez a profilhoz még nincs fix edzés hozzárendelve.</div>`
    }
  `;

  bindCardEvents();
}

async function loadItems() {
  if (!state.uid) return;

  try {
    const colRef = fs.collection(db, "users", state.uid, "fixedExercises");
    const snap = await fs.getDocs(colRef);

    const items = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      console.log("Firebase doc betöltve:", docSnap.id, data);
      return {
        id: docSnap.id,
        ...data
      };
    });

    normalizeItems(items);
  } catch (err) {
    console.error("Fix edzések betöltési hiba:", err);
    state.items = [];
  }
}

export async function initFixedExercisesUI({ uid }) {
  state.uid = String(uid || "").trim();
  if (!state.uid) return;

  injectStyles();
  ensureRoot();

  if (state.unsub) {
    try { state.unsub(); } catch {}
    state.unsub = null;
  }

  await loadItems();
  render();

  try {
    const colRef = fs.collection(db, "users", state.uid, "fixedExercises");

    state.unsub = fs.onSnapshot(colRef, (snap) => {
      const items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      normalizeItems(items);
      render();
    }, (err) => {
      console.error("Fix edzések realtime hiba:", err);
      render();
    });
  } catch (e) {
    console.error("Fix edzés onSnapshot hiba:", e);
    render();
  }
}
