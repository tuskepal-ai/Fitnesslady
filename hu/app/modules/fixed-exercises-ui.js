import { db, fs, escapeHtml } from "../../shared/firebase.js";
import { getExerciseAsset } from "./fixed-exercises-assets.js";

const USER_ASSIGN_SUBCOL = "fixedExercises";

const state = {
  uid: "",
  mounted: false,
  items: [],
  timers: new Map(),
  els: {
    section: null,
    list: null,
    detailOverlay: null,
    detailTitle: null,
    detailBody: null
  }
};

export async function initFixedExercisesUI({ uid }) {
  if (!uid) return;
  state.uid = uid;

  injectSection();
  injectDetailModal();

  await loadAssignedExercises();
  render();

  if (!state.mounted) {
    bindStaticEvents();
    state.mounted = true;
  }
}

async function loadAssignedExercises() {
  try {
    const snap = await fs.getDocs(
      fs.query(
        fs.collection(db, "users", state.uid, USER_ASSIGN_SUBCOL),
        fs.orderBy("sortOrder", "asc")
      )
    );

    state.items = snap.docs
      .map((docSnap) => {
        const raw = docSnap.data() || {};
        return {
          id: docSnap.id,
          exerciseId: raw.exerciseId || docSnap.id,
          name: String(raw.name || "").trim() || "—",
          desc: String(raw.desc || "").trim(),
          category: String(raw.category || "").trim() || "Általános",
          imageUrl: String(raw.imageUrl || "").trim(),
          workSec: Math.max(0, Number(raw.workSec || 0)),
          restSec: Math.max(0, Number(raw.restSec || 0)),
          rounds: Math.max(1, Number(raw.rounds || 1)),
          repsText: String(raw.repsText || "").trim(),
          type: String(raw.type || "nem-videós").trim(),
          difficulty: String(raw.difficulty || "közepes").trim(),
          active: raw.active !== false,
          sortOrder: Number(raw.sortOrder || 0)
        };
      })
      .filter((x) => x.active !== false);

    syncTimersToItems();
  } catch (e) {
    console.error("Fix edzések betöltési hiba:", e);
    state.items = [];
  }
}

function syncTimersToItems() {
  const validIds = new Set(state.items.map((x) => x.id));

  for (const [id, timer] of state.timers.entries()) {
    if (!validIds.has(id)) {
      clearTimer(timer);
      state.timers.delete(id);
    }
  }

  state.items.forEach((item) => {
    if (!state.timers.has(item.id)) {
      state.timers.set(item.id, createDefaultTimer(item));
    }
  });
}

function createDefaultTimer(item) {
  return {
    id: item.id,
    running: false,
    paused: false,
    completed: false,
    phase: "work",
    currentRound: 1,
    remainingSec: item.workSec,
    totalPhaseSec: Math.max(1, item.workSec),
    intervalId: null
  };
}

function bindStaticEvents() {
  const reloadBtn = document.getElementById("fixedExercisesReloadBtn");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", async () => {
      await loadAssignedExercises();
      render();
    });
  }

  const overlay = document.getElementById("fixedExerciseDetailOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDetailModal();
    });
  }

  const closeBtn = document.getElementById("fixedExerciseDetailClose");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeDetailModal);
  }
}

function injectSection() {
  if (document.getElementById("fixedExercisesMount")) {
    state.els.section = document.getElementById("fixedExercisesSection");
    state.els.list = document.getElementById("fixedExercisesList");
    ensureNavLink();
    return;
  }

  ensureNavLink();

  const technika = document.getElementById("technika");
  if (!technika) return;

  const wrapper = document.createElement("section");
  wrapper.id = "fixedExercisesMount";
  wrapper.className = "glass card";
  wrapper.innerHTML = `
    <div id="fixedExercisesSection">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:14px;">
        <div>
          <div class="chip" style="margin-bottom:10px;">• Fix edzések</div>
          <h3 style="margin-bottom:6px;">Saját fix edzéseid</h3>
          <p class="sub" style="margin-bottom:0;">Az admin által hozzád rendelt képes edzések. Indítható stopperrel, körökkel és pihenő szakaszokkal.</p>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="pill ghost" id="fixedExercisesReloadBtn" type="button">Frissítés</button>
        </div>
      </div>

      <div id="fixedExercisesList" class="fix-list"></div>
    </div>
  `;

  technika.parentNode.insertBefore(wrapper, technika);

  state.els.section = wrapper.querySelector("#fixedExercisesSection");
  state.els.list = wrapper.querySelector("#fixedExercisesList");
}

function ensureNavLink() {
  const nav = document.querySelector(".nav");
  if (!nav) return;

  const exists = Array.from(nav.querySelectorAll("a")).some(
    (a) => (a.getAttribute("href") || "") === "#fixedExercisesMount"
  );
  if (exists) return;

  const a = document.createElement("a");
  a.href = "#fixedExercisesMount";
  a.setAttribute("data-nav", "");
  a.textContent = "Fix edzések";
  nav.insertBefore(a, nav.querySelector('a[href="#technika"]') || null);
}

function injectDetailModal() {
  if (document.getElementById("fixedExerciseDetailOverlay")) {
    state.els.detailOverlay = document.getElementById("fixedExerciseDetailOverlay");
    state.els.detailTitle = document.getElementById("fixedExerciseDetailTitle");
    state.els.detailBody = document.getElementById("fixedExerciseDetailBody");
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "fixedExerciseDetailOverlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="glass modal" role="dialog" aria-modal="true" aria-labelledby="fixedExerciseDetailTitle">
      <div class="modal-header">
        <h2 class="modal-title" id="fixedExerciseDetailTitle">Edzés részletei</h2>
        <button class="modal-close" id="fixedExerciseDetailClose" type="button" aria-label="Bezárás">✕</button>
      </div>
      <div class="modal-body" id="fixedExerciseDetailBody"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  state.els.detailOverlay = overlay;
  state.els.detailTitle = overlay.querySelector("#fixedExerciseDetailTitle");
  state.els.detailBody = overlay.querySelector("#fixedExerciseDetailBody");
}

function render() {
  const list = state.els.list;
  if (!list) return;

  if (!state.items.length) {
    list.innerHTML = `
      <div class="row">
        <div>
          <div class="title">Nincs hozzád rendelt fix edzés</div>
          <div class="desc">Az admin oldalon lehet fix edzést hozzárendelni a felhasználóhoz.</div>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = state.items.map(renderCard).join("");

  list.querySelectorAll("[data-fx-detail]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fx-detail") || "";
      openDetailModal(id);
    });
  });

  list.querySelectorAll("[data-fx-start]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fx-start") || "";
      startExercise(id);
    });
  });
}

function renderCard(item) {
  const asset = getExerciseAsset(item.exerciseId || item.id || item.name);
  const timer = ensureTimer(item);

  const imageSrc = item.imageUrl || asset.image || "";
  const progressDeg = calculateProgressDegrees(timer);
  const timeText = formatTime(timer.remainingSec);
  const phaseLabel = timer.completed ? "kész" : timer.phase === "rest" ? "pihenőidő" : "munkaidő";
  const badgeLabel = item.category || "Általános";

  return `
    <article class="fix-card">
      <div class="fix-img" style="background:${escapeAttr(asset.cardBackground || "radial-gradient(circle at 30% 30%, #ff4fd8, #3b0a3f)")};">
        <img src="${escapeAttr(imageSrc)}" alt="${escapeAttr(item.name)}" />
      </div>

      <div class="fix-content">
        <div>
          <div class="fix-title-row">
            <div class="fix-title">${escapeHtml(item.name)}</div>
            <div class="fix-badge">${escapeHtml(badgeLabel)}</div>
          </div>

          <div class="fix-desc">${escapeHtml(item.desc || "")}</div>

          <div class="fix-meta">
            <div class="fix-chip">⏱ ${item.workSec} mp munka</div>
            <div class="fix-chip">◔ ${item.restSec} mp pihenő</div>
            <div class="fix-chip">↻ ${item.rounds} kör</div>
          </div>
        </div>

        <div class="fix-actions">
          <button class="fix-btn secondary" type="button" data-fx-detail="${escapeAttr(item.id)}">Részletek</button>
          <button class="fix-btn primary" type="button" data-fx-start="${escapeAttr(item.id)}">
            ${timer.running ? "Fut" : timer.completed ? "Újraindítás" : "Indítás"}
          </button>
        </div>
      </div>

      <div class="fix-timer">
        <div class="fix-timer-circle" style="--progress:${progressDeg}deg;">
          <div class="fix-timer-inner">
            <div class="fix-time">${escapeHtml(timeText)}</div>
            <div class="fix-label">${escapeHtml(phaseLabel)}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function ensureTimer(item) {
  if (!state.timers.has(item.id)) {
    state.timers.set(item.id, createDefaultTimer(item));
  }
  return state.timers.get(item.id);
}

function startExercise(id) {
  const item = state.items.find((x) => x.id === id);
  if (!item) return;

  const timer = ensureTimer(item);

  if (timer.running) return;

  if (timer.completed) {
    resetTimerState(timer, item);
  }

  timer.running = true;
  timer.paused = false;

  clearTimer(timer);
  timer.intervalId = window.setInterval(() => {
    tickExercise(item.id);
  }, 1000);

  render();
}

function tickExercise(id) {
  const item = state.items.find((x) => x.id === id);
  if (!item) return;

  const timer = ensureTimer(item);
  if (!timer.running) return;

  timer.remainingSec -= 1;

  if (timer.remainingSec > 0) {
    render();
    return;
  }

  if (timer.phase === "work" && item.restSec > 0) {
    timer.phase = "rest";
    timer.remainingSec = item.restSec;
    timer.totalPhaseSec = Math.max(1, item.restSec);
    render();
    return;
  }

  if (timer.currentRound < item.rounds) {
    timer.currentRound += 1;
    timer.phase = "work";
    timer.remainingSec = item.workSec;
    timer.totalPhaseSec = Math.max(1, item.workSec);
    render();
    return;
  }

  timer.completed = true;
  timer.running = false;
  timer.paused = false;
  timer.phase = "work";
  timer.remainingSec = item.workSec;
  timer.totalPhaseSec = Math.max(1, item.workSec);

  clearTimer(timer);
  render();
}

function resetTimerState(timer, item) {
  clearTimer(timer);
  timer.running = false;
  timer.paused = false;
  timer.completed = false;
  timer.phase = "work";
  timer.currentRound = 1;
  timer.remainingSec = item.workSec;
  timer.totalPhaseSec = Math.max(1, item.workSec);
}

function clearTimer(timer) {
  if (timer?.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
}

function openDetailModal(id) {
  const item = state.items.find((x) => x.id === id);
  if (!item || !state.els.detailOverlay || !state.els.detailBody || !state.els.detailTitle) return;

  const asset = getExerciseAsset(item.exerciseId || item.id || item.name);
  const imageSrc = item.imageUrl || asset.image || "";
  const timer = ensureTimer(item);

  state.els.detailTitle.textContent = item.name;
  state.els.detailBody.innerHTML = `
    <div style="display:grid; gap:16px;">
      <div style="display:grid; grid-template-columns:140px 1fr; gap:16px; align-items:start;">
        <div style="width:140px; height:140px; border-radius:20px; display:flex; align-items:center; justify-content:center; background:${escapeAttr(asset.cardBackground || "radial-gradient(circle at 30% 30%, #ff4fd8, #3b0a3f)")}; box-shadow:0 0 30px rgba(255,79,216,.35);">
          <img src="${escapeAttr(imageSrc)}" alt="${escapeAttr(item.name)}" style="width:80%; height:auto;" />
        </div>

        <div>
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
            <strong style="font-size:22px;">${escapeHtml(item.name)}</strong>
            <span style="font-size:12px; padding:5px 10px; border-radius:999px; background:rgba(255,79,216,.15); border:1px solid rgba(255,79,216,.35); color:#ff91ea;">${escapeHtml(item.category)}</span>
          </div>

          <div style="color:rgba(255,255,255,.72); line-height:1.6; margin-bottom:12px;">
            ${escapeHtml(item.desc || "")}
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:10px;">
            <span class="chip">⏱ ${item.workSec} mp munka</span>
            <span class="chip">◔ ${item.restSec} mp pihenő</span>
            <span class="chip">↻ ${item.rounds} kör</span>
            ${item.repsText ? `<span class="chip"># ${escapeHtml(item.repsText)}</span>` : ""}
            <span class="chip">${escapeHtml(item.difficulty)}</span>
            <span class="chip">${escapeHtml(item.type)}</span>
          </div>
        </div>
      </div>

      <div class="glass" style="padding:16px;">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
          <div>
            <div style="font-weight:800; margin-bottom:4px;">Aktuális állapot</div>
            <div style="color:rgba(255,255,255,.70); font-size:13px;">
              Kör: ${timer.currentRound}/${item.rounds} • ${timer.completed ? "kész" : timer.phase === "rest" ? "pihenő szakasz" : "munka szakasz"}
            </div>
          </div>

          <div style="font-size:28px; font-weight:900; color:#fff;">
            ${escapeHtml(formatTime(timer.remainingSec))}
          </div>
        </div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="pill primary" id="fixedExerciseDetailStartBtn" type="button">${timer.completed ? "Újraindítás" : timer.running ? "Fut" : "Indítás"}</button>
        <button class="pill ghost" id="fixedExerciseDetailCloseBtn" type="button">Bezárás</button>
      </div>
    </div>
  `;

  state.els.detailOverlay.classList.add("is-open");
  state.els.detailOverlay.setAttribute("aria-hidden", "false");

  state.els.detailBody.querySelector("#fixedExerciseDetailStartBtn")?.addEventListener("click", () => {
    startExercise(item.id);
    openDetailModal(item.id);
  });

  state.els.detailBody.querySelector("#fixedExerciseDetailCloseBtn")?.addEventListener("click", closeDetailModal);
}

function closeDetailModal() {
  if (!state.els.detailOverlay) return;
  state.els.detailOverlay.classList.remove("is-open");
  state.els.detailOverlay.setAttribute("aria-hidden", "true");
}

function calculateProgressDegrees(timer) {
  if (!timer || timer.totalPhaseSec <= 0) return 0;
  const passed = timer.totalPhaseSec - timer.remainingSec;
  const ratio = Math.max(0, Math.min(1, passed / timer.totalPhaseSec));
  return Math.round(ratio * 360);
}

function formatTime(totalSec) {
  const s = Math.max(0, Number(totalSec || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
