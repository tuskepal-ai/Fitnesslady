// FILE: /hu/app/modules/fixed-exercises-ui.js

import { db, fs, escapeHtml } from "../../shared/firebase.js";
import { getExerciseAsset } from "./fixed-exercises-assets.js";

const USER_ASSIGN_SUBCOL = "fixedExercises";

const state = {
  uid: "",
  mounted: false,
  activeIndex: 0,
  items: [],
  timers: new Map(),
  els: {
    root: null,
    list: null,
    track: null,
    refreshBtn: null,
    detailOverlay: null,
    detailTitle: null,
    detailBody: null
  }
};

export async function initFixedExercisesUI({ uid }) {
  if (!uid) return;

  state.uid = uid;

  ensureMount();
  ensureDetailModal();
  bindStaticEvents();

  await loadAssignedExercises();
  render();
  syncActiveCardToCenter(true);
}

async function loadAssignedExercises() {
  try {
    const queryRef = fs.query(
      fs.collection(db, "users", state.uid, USER_ASSIGN_SUBCOL),
      fs.orderBy("sortOrder", "asc")
    );

    const snap = await fs.getDocs(queryRef);

    state.items = snap.docs
      .map((docSnap) => {
        const raw = docSnap.data() || {};
        const id = docSnap.id;
        const asset = getExerciseAsset(raw.exerciseId || raw.name || id);

        return {
          id,
          exerciseId: String(raw.exerciseId || id),
          name: String(raw.name || "").trim() || "Edzés",
          desc: String(raw.desc || "").trim(),
          category: String(raw.category || "").trim() || "Általános",
          imageUrl: String(raw.imageUrl || "").trim() || asset.image || "",
          workSec: Math.max(1, Number(raw.workSec || 30)),
          restSec: Math.max(0, Number(raw.restSec || 15)),
          rounds: Math.max(1, Number(raw.rounds || 3)),
          repsText: String(raw.repsText || "").trim(),
          difficulty: String(raw.difficulty || "közepes").trim(),
          type: String(raw.type || "nem-videós").trim(),
          sortOrder: Number(raw.sortOrder || 0),
          active: raw.active !== false,
          accent: asset.accent || "#ff4fd8",
          accent2: asset.accent2 || "#b14cff",
          cardBackground:
            asset.cardBackground ||
            "radial-gradient(circle at 28% 18%, rgba(255,255,255,.18), transparent 30%), linear-gradient(135deg, rgba(255,79,216,.28), rgba(177,76,255,.12))"
        };
      })
      .filter((item) => item.active !== false);

    syncTimers();
    if (state.activeIndex > state.items.length - 1) state.activeIndex = 0;
  } catch (error) {
    console.error("Fix edzések betöltési hiba:", error);
    state.items = [];
    state.activeIndex = 0;
  }
}

function syncTimers() {
  const validIds = new Set(state.items.map((x) => x.id));

  for (const [id, timer] of state.timers.entries()) {
    if (!validIds.has(id)) {
      stopTimerInterval(timer);
      state.timers.delete(id);
    }
  }

  state.items.forEach((item) => {
    if (!state.timers.has(item.id)) {
      state.timers.set(item.id, createTimer(item));
    }
  });
}

function createTimer(item) {
  return {
    itemId: item.id,
    running: false,
    completed: false,
    phase: "work",
    currentRound: 1,
    remainingSec: item.workSec,
    totalSec: item.workSec,
    intervalId: null
  };
}

function ensureMount() {
  let mount = document.getElementById("fixedExercisesMount");

  if (!mount) {
    const technika = document.getElementById("technika");
    if (!technika) return;

    mount = document.createElement("section");
    mount.id = "fixedExercisesMount";
    mount.className = "glass card";
    technika.parentNode.insertBefore(mount, technika);
  }

  mount.innerHTML = `
    <div class="fe-root" id="feRoot">
      <div class="fe-header">
        <div>
          <div class="chip" style="margin-bottom:10px;">• Fix edzések</div>
          <div class="fe-title">Saját fix edzéseid</div>
          <div class="sub" style="margin-top:6px; margin-bottom:0;">
            Az admin által hozzád rendelt képes edzések. Swipe-pal lapozható, fókuszált nézet.
          </div>
        </div>

        <button class="fe-refresh" id="feRefreshBtn" type="button">Frissítés</button>
      </div>

      <div class="fe-carousel">
        <div class="fe-track" id="feTrack"></div>
      </div>
    </div>
  `;

  state.els.root = mount.querySelector("#feRoot");
  state.els.track = mount.querySelector("#feTrack");
  state.els.refreshBtn = mount.querySelector("#feRefreshBtn");
}

function ensureDetailModal() {
  if (document.getElementById("feDetailOverlay")) {
    state.els.detailOverlay = document.getElementById("feDetailOverlay");
    state.els.detailTitle = document.getElementById("feDetailTitle");
    state.els.detailBody = document.getElementById("feDetailBody");
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "feDetailOverlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="glass modal" role="dialog" aria-modal="true" aria-labelledby="feDetailTitle">
      <div class="modal-header">
        <h2 class="modal-title" id="feDetailTitle">Edzés részletei</h2>
        <button class="modal-close" id="feDetailClose" type="button" aria-label="Bezárás">✕</button>
      </div>
      <div class="modal-body" id="feDetailBody"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  state.els.detailOverlay = overlay;
  state.els.detailTitle = overlay.querySelector("#feDetailTitle");
  state.els.detailBody = overlay.querySelector("#feDetailBody");
}

function bindStaticEvents() {
  if (state.mounted) return;
  state.mounted = true;

  state.els.refreshBtn?.addEventListener("click", async () => {
    await loadAssignedExercises();
    render();
    syncActiveCardToCenter(true);
  });

  state.els.track?.addEventListener("scroll", handleTrackScroll, { passive: true });

  state.els.detailOverlay?.addEventListener("click", (e) => {
    if (e.target === state.els.detailOverlay) closeDetailModal();
  });

  document.getElementById("feDetailClose")?.addEventListener("click", closeDetailModal);

  window.addEventListener("resize", () => {
    syncActiveCardToCenter(false);
  });
}

function render() {
  if (!state.els.track) return;

  if (!state.items.length) {
    state.els.track.innerHTML = `
      <div class="row" style="width:100%;">
        <div>
          <div class="title">Nincs hozzád rendelt fix edzés</div>
          <div class="desc">Az admin oldalon lehet fix edzést hozzárendelni a felhasználóhoz.</div>
        </div>
      </div>
    `;
    return;
  }

  state.els.track.innerHTML = state.items
    .map((item, index) => renderCard(item, index, index === state.activeIndex))
    .join("");

  state.els.track.querySelectorAll(".fe-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".fe-btn")) return;
      const index = Number(card.getAttribute("data-index") || 0);
      setActiveIndex(index, true);
    });
  });

  state.els.track.querySelectorAll("[data-fe-detail]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-fe-detail") || "";
      openDetailModal(id);
    });
  });

  state.els.track.querySelectorAll("[data-fe-start]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-fe-start") || "";
      toggleStart(id);
    });
  });
}

function renderCard(item, index, isActive) {
  const timer = ensureTimer(item);
  const progressDeg = calcProgressDeg(timer);
  const timeText = formatTime(timer.remainingSec);
  const phaseText = timer.completed
    ? "kész"
    : timer.phase === "rest"
      ? "pihenő"
      : "munkaidő";

  return `
    <article
      class="fe-card ${isActive ? "active" : ""}"
      data-index="${index}"
      data-id="${escapeAttr(item.id)}"
      style="box-shadow:${isActive ? `0 20px 50px rgba(255,0,150,0.18), 0 0 0 1px rgba(255,80,200,0.12)` : "none"};"
    >
      <div
        class="fe-card-img"
        style="background:${escapeAttr(item.cardBackground)};"
      >
        ${item.imageUrl ? `<img src="${escapeAttr(item.imageUrl)}" alt="${escapeAttr(item.name)}">` : ""}
      </div>

      <div class="fe-card-title">${escapeHtml(item.name)}</div>
      <div class="fe-card-sub">${escapeHtml(item.category)}</div>
      <div class="fe-card-desc">${escapeHtml(item.desc || "")}</div>

      <div class="fe-meta">
        <div class="fe-pill">⏱ ${item.workSec} mp munka</div>
        <div class="fe-pill">◔ ${item.restSec} mp pihenő</div>
        <div class="fe-pill">↻ ${item.rounds} kör</div>
      </div>

      <div class="fe-timer">
        <div
          class="fe-timer-circle"
          style="background:conic-gradient(${escapeAttr(item.accent)} ${progressDeg}deg, rgba(255,255,255,0.08) 0deg); box-shadow:0 0 28px color-mix(in srgb, ${escapeAttr(item.accent)} 45%, transparent);"
        >
          <div class="fe-timer-inner">
            <div class="fe-time">${escapeHtml(timeText)}</div>
            <div class="fe-time-sub">${escapeHtml(phaseText)}</div>
          </div>
        </div>
      </div>

      <div class="fe-actions">
        <button class="fe-btn secondary" type="button" data-fe-detail="${escapeAttr(item.id)}">Részletek</button>
        <button class="fe-btn primary" type="button" data-fe-start="${escapeAttr(item.id)}">
          ${timer.running ? "Fut" : timer.completed ? "Újraindítás" : "Indítás"}
        </button>
      </div>
    </article>
  `;
}

function ensureTimer(item) {
  if (!state.timers.has(item.id)) {
    state.timers.set(item.id, createTimer(item));
  }
  return state.timers.get(item.id);
}

function toggleStart(itemId) {
  const item = state.items.find((x) => x.id === itemId);
  if (!item) return;

  const timer = ensureTimer(item);

  if (timer.running) return;

  if (timer.completed) {
    resetTimer(timer, item);
  }

  timer.running = true;
  stopTimerInterval(timer);

  timer.intervalId = window.setInterval(() => {
    tick(itemId);
  }, 1000);

  render();
}

function tick(itemId) {
  const item = state.items.find((x) => x.id === itemId);
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
    timer.totalSec = Math.max(1, item.restSec);
    render();
    return;
  }

  if (timer.currentRound < item.rounds) {
    timer.currentRound += 1;
    timer.phase = "work";
    timer.remainingSec = item.workSec;
    timer.totalSec = Math.max(1, item.workSec);
    render();
    return;
  }

  timer.running = false;
  timer.completed = true;
  timer.phase = "work";
  timer.remainingSec = item.workSec;
  timer.totalSec = Math.max(1, item.workSec);
  stopTimerInterval(timer);

  render();
}

function resetTimer(timer, item) {
  stopTimerInterval(timer);
  timer.running = false;
  timer.completed = false;
  timer.phase = "work";
  timer.currentRound = 1;
  timer.remainingSec = item.workSec;
  timer.totalSec = Math.max(1, item.workSec);
}

function stopTimerInterval(timer) {
  if (timer?.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
}

function openDetailModal(itemId) {
  const item = state.items.find((x) => x.id === itemId);
  if (!item || !state.els.detailOverlay || !state.els.detailBody || !state.els.detailTitle) return;

  const timer = ensureTimer(item);

  state.els.detailTitle.textContent = item.name;
  state.els.detailBody.innerHTML = `
    <div style="display:grid; gap:16px;">
      <div style="display:grid; grid-template-columns:120px 1fr; gap:16px; align-items:start;">
        <div style="width:120px; height:120px; border-radius:18px; display:flex; align-items:center; justify-content:center; background:${escapeAttr(item.cardBackground)};">
          ${item.imageUrl ? `<img src="${escapeAttr(item.imageUrl)}" alt="${escapeAttr(item.name)}" style="max-width:80%; max-height:80%;">` : ""}
        </div>

        <div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
            <strong style="font-size:22px; color:#fff;">${escapeHtml(item.name)}</strong>
            <span class="chip">${escapeHtml(item.category)}</span>
          </div>

          <div style="color:rgba(255,255,255,.74); line-height:1.6; margin-bottom:10px;">
            ${escapeHtml(item.desc || "")}
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <span class="chip">⏱ ${item.workSec} mp munka</span>
            <span class="chip">◔ ${item.restSec} mp pihenő</span>
            <span class="chip">↻ ${item.rounds} kör</span>
            ${item.repsText ? `<span class="chip">${escapeHtml(item.repsText)}</span>` : ""}
            <span class="chip">${escapeHtml(item.difficulty)}</span>
            <span class="chip">${escapeHtml(item.type)}</span>
          </div>
        </div>
      </div>

      <div class="glass" style="padding:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div>
            <div style="font-weight:900; color:#fff; margin-bottom:4px;">Aktuális állapot</div>
            <div style="font-size:13px; color:rgba(255,255,255,.7);">
              Kör: ${timer.currentRound}/${item.rounds} • ${timer.completed ? "kész" : timer.phase === "rest" ? "pihenő szakasz" : "munka szakasz"}
            </div>
          </div>

          <div style="font-size:28px; font-weight:900; color:#fff;">
            ${escapeHtml(formatTime(timer.remainingSec))}
          </div>
        </div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="pill primary" id="feDetailStartBtn" type="button">${timer.running ? "Fut" : timer.completed ? "Újraindítás" : "Indítás"}</button>
        <button class="pill ghost" id="feDetailCloseBtn" type="button">Bezárás</button>
      </div>
    </div>
  `;

  state.els.detailOverlay.classList.add("is-open");
  state.els.detailOverlay.setAttribute("aria-hidden", "false");

  state.els.detailBody.querySelector("#feDetailStartBtn")?.addEventListener("click", () => {
    toggleStart(item.id);
    openDetailModal(item.id);
  });

  state.els.detailBody.querySelector("#feDetailCloseBtn")?.addEventListener("click", closeDetailModal);
}

function closeDetailModal() {
  if (!state.els.detailOverlay) return;
  state.els.detailOverlay.classList.remove("is-open");
  state.els.detailOverlay.setAttribute("aria-hidden", "true");
}

function handleTrackScroll() {
  if (!state.els.track) return;

  if (handleTrackScroll._raf) cancelAnimationFrame(handleTrackScroll._raf);
  handleTrackScroll._raf = requestAnimationFrame(() => {
    const cards = Array.from(state.els.track.querySelectorAll(".fe-card"));
    if (!cards.length) return;

    const center = state.els.track.scrollLeft + state.els.track.clientWidth / 2;

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const dist = Math.abs(center - cardCenter);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestIndex = index;
      }
    });

    if (bestIndex !== state.activeIndex) {
      state.activeIndex = bestIndex;
      render();
    }
  });
}

function setActiveIndex(index, scrollToCard = false) {
  const safeIndex = Math.max(0, Math.min(index, state.items.length - 1));
  state.activeIndex = safeIndex;
  render();
  if (scrollToCard) syncActiveCardToCenter(true);
}

function syncActiveCardToCenter(smooth = true) {
  if (!state.els.track) return;
  const cards = Array.from(state.els.track.querySelectorAll(".fe-card"));
  const active = cards[state.activeIndex];
  if (!active) return;

  const left = active.offsetLeft - (state.els.track.clientWidth / 2 - active.clientWidth / 2);
  state.els.track.scrollTo({
    left,
    behavior: smooth ? "smooth" : "auto"
  });
}

function calcProgressDeg(timer) {
  if (!timer || timer.totalSec <= 0) return 0;
  const elapsed = timer.totalSec - timer.remainingSec;
  const ratio = Math.max(0, Math.min(1, elapsed / timer.totalSec));
  return Math.round(ratio * 360);
}

function formatTime(sec) {
  const total = Math.max(0, Number(sec || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
