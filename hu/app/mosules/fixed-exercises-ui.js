import { db, fs, escapeHtml } from "../../shared/firebase.js";
import { getExerciseAsset } from "./fixed-exercises-assets.js";

const USER_ASSIGN_SUBCOL = "fixedExercises";

const state = {
  uid: "",
  items: [],
  timers: new Map(), // exerciseId -> timer state
  mounted: false
};

const els = {
  section: null,
  list: null,
  detailOverlay: null,
  detailTitle: null,
  detailBody: null
};

export async function initFixedExercisesUI({ uid }) {
  if (!uid) return;
  state.uid = uid;

  injectSection();
  injectDetailModal();
  bindStaticEvents();

  await loadAssignedExercises();
  render();
}

async function loadAssignedExercises() {
  try {
    const snap = await fs.getDocs(
      fs.query(
        fs.collection(db, "users", state.uid, USER_ASSIGN_SUBCOL),
        fs.orderBy("sortOrder", "asc")
      )
    );

    state.items = snap.docs.map((d) => {
      const raw = d.data() || {};
      return {
        id: d.id,
        exerciseId: raw.exerciseId || d.id,
        name: raw.name || "—",
        desc: raw.desc || "",
        category: raw.category || "Általános",
        imageUrl: raw.imageUrl || "",
        workSec: Number(raw.workSec || 0),
        restSec: Number(raw.restSec || 0),
        rounds: Math.max(1, Number(raw.rounds || 1)),
        repsText: raw.repsText || "",
        type: raw.type || "nem-videós",
        difficulty: raw.difficulty || "közepes",
        active: raw.active !== false,
        sortOrder: Number(raw.sortOrder || 0)
      };
    }).filter(x => x.active !== false);
  } catch (e) {
    console.error("Fix edzések betöltési hiba:", e);
    state.items = [];
  }
}

function injectSection() {
  if (document.getElementById("fixedExercisesSection")) {
    els.section = document.getElementById("fixedExercisesSection");
    els.list = document.getElementById("fixedExercisesList");
    return;
  }

  const nav = document.querySelector(".nav");
  if (nav && !nav.querySelector('[href="#fixed-exercises"]')) {
    const a = document.createElement("a");
    a.href = "#fixed-exercises";
    a.setAttribute("data-nav", "");
    a.textContent = "Fix edzések";
    nav.appendChild(a);
  }

  const target = document.getElementById("technika");
  if (!target) return;

  const section = document.createElement("section");
  section.id = "fixed-exercises";
  section.className = "glass card";
  section.innerHTML = `
    <div id="fixedExercisesSection" class="fx-wrap">
      <div class="fx-head">
        <div class="fx-head-left">
          <div class="fx-kicker">
            <span class="fx-kicker-dot"></span>
            <span>Fix edzések</span>
          </div>
          <h3 class="fx-title">Saját fix edzéseid</h3>
          <p class="fx-sub">
            Az admin által hozzád rendelt képes edzések. Indítható stopperrel, körökkel és pihenő szakaszokkal.
          </p>
        </div>

        <div class="fx-toolbar">
          <button class="pill ghost" id="fxReloadBtn" type="button">Frissítés</button>
        </div>
      </div>

      <div id="fixedExercisesList" class="fx-grid"></div>
    </div>
  `;
  target.parentNode.insertBefore(section, target);

  els.section = section.querySelector("#fixedExercisesSection");
  els.list = section.querySelector("#fixedExercisesList");

  const reloadBtn = section.querySelector("#fxReloadBtn");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", async () => {
      await loadAssignedExercises();
      render();
    });
  }
}

function injectDetailModal() {
  if (document.getElementById("fxDetailOverlay")) {
    els.detailOverlay = document.getElementById("fxDetailOverlay");
    els.detailTitle = document.getElementById("fxDetailTitle");
    els.detailBody = document.getElementById("fxDetailBody");
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "modal-overlay";
  wrap.id = "fxDetailOverlay";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `
    <div class="glass modal" role="dialog" aria-modal="true" aria-labelledby="fxDetailTitle">
      <div class="modal-header">
        <h2 class="modal-title" id="fxDetailTitle">Edzés részletei</h2>
        <button class="modal-close" id="fxDetailClose" type="button" aria-label="Bezárás">✕</button>
      </div>
      <div class="modal-body" id="fxDetailBody"></div>
    </div>
  `;
  document.body.appendChild(wrap);

  els.detailOverlay = wrap;
  els.detailTitle = wrap.querySelector("#fxDetailTitle");
  els.detailBody = wrap.querySelector("#fxDetailBody");

  wrap.querySelector("#fxDetailClose")?.addEventListener("click", closeDetail);
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeDetail();
  });
}

function bindStaticEvents() {
  if (state.mounted) return;
  state.mounted = true;
}

function render() {
  if (!els.list) return;

  if (!state.items.length) {
    els.list.innerHTML = `
      <div class="fx-empty">
        Jelenleg nincs hozzád rendelt fix edzés.
      </div>
    `;
    return;
  }

  els.list.innerHTML = state.items.map((item) => renderCard(item)).join("");

  els.list.querySelectorAll("[data-fx-start]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fx-start");
      startExercise(id);
    });
  });

  els.list.querySelectorAll("[data-fx-pause]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fx-pause");
      togglePause(id);
    });
  });

  els.list.querySelectorAll("[data-fx-reset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fx-reset");
      resetExercise(id);
    });
  });

  els.list.querySelectorAll("[data-fx-detail]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fx-detail");
      openDetail(id);
    });
  });
}

function renderCard(item) {
  const asset = getExerciseAsset(item.exerciseId || item.id || item.name);
  const timer = ensureTimer(item);
  const displayImage = item.imageUrl || asset.image;
  const progressDeg = timer.totalPhaseSec > 0
    ? `${Math.max(0, Math.min(360, ((timer.totalPhaseSec - timer.remainingSec) / timer.totalPhaseSec) * 360))}deg`
    : "0deg";

  const statusLabel =
    timer.completed
      ? "Kész"
      : timer.phase === "rest"
        ? "Pihenő"
        : "Munkaidő";

  const running = timer.running ? "true" : "false";
  const gradient = asset.gradient || "linear-gradient(135deg, #ff4fd8, #b14cff)";
  const glow = asset.glow || "rgba(255,79,216,.20)";

  return `
    <article class="fx-card" data-running="${running}" style="--fx-card-glow:${escapeAttr(glow)};">
      <div class="fx-card-inner">
        <div class="fx-visual" style="background:${escapeAttr(gradient)};">
          <img class="fx-visual-img" src="${escapeAttr(displayImage)}" alt="${escapeAttr(item.name)}" />
          <div class="fx-visual-badge">FL</div>
        </div>

        <div class="fx-content">
          <div class="fx-name-row">
            <h4 class="fx-name">${escapeHtml(item.name)}</h4>
            <span class="fx-muscle">${escapeHtml(item.category)}</span>
          </div>

          <p class="fx-desc">${escapeHtml(item.desc)}</p>

          <div class="fx-meta">
            <span class="fx-meta-chip"><span class="icon">⏱</span>${item.workSec} mp munka</span>
            <span class="fx-meta-chip"><span class="icon">◔</span>${item.restSec} mp pihenő</span>
            <span class="fx-meta-chip"><span class="icon">↻</span>${item.rounds} kör</span>
            ${item.repsText ? `<span class="fx-meta-chip"><span class="icon">#</span>${escapeHtml(item.repsText)}</span>` : ""}
            <span class="fx-meta-chip"><span class="icon">●</span>${escapeHtml(item.difficulty)}</span>
          </div>

          <div class="fx-actions">
            <button class="fx-btn secondary" type="button" data-fx-detail="${escapeAttr(item.id)}">Részletek</button>
            <button class="fx-btn primary" type="button" data-fx-start="${escapeAttr(item.id)}" style="background:${escapeAttr(gradient)};">
              ${timer.completed ? "Újraindítás" : timer.running ? "Fut" : "Indítás"}
            </button>
            <button class="fx-btn small" type="button" data-fx-pause="${escapeAttr(item.id)}">
              ${timer.paused ? "Folytatás" : "Szünet"}
            </button>
            <button class="fx-btn small" type="button" data-fx-reset="${escapeAttr(item.id)}">Reset</button>
          </div>
        </div>

        <div class="fx-timer-col">
          <div class="fx-session">
            <div class="fx-ring" style="--progress:${progressDeg}; --ring-accent:${extractAccentColor(gradient)}; --ring-glow:${escapeAttr(glow)};">
              <div class="fx-ring-content">
                <span class="fx-ring-time">${formatSec(timer.remainingSec)}</span>
                <span class="fx-ring-label">${escapeHtml(statusLabel)}</span>
                <span class="fx-ring-round">Kör ${Math.min(timer.currentRound, item.rounds)}/${item.rounds}</span>
              </div>
            </div>

            <div class="fx-session-box">
              <div class="fx-session-top">
                <div>
                  <h5 class="fx-session-title">${escapeHtml(item.name)}</h5>
                  <p class="fx-session-sub">Munka + pihenő körvezérlés</p>
                </div>
                <span class="fx-session-status ${timer.completed ? "done" : timer.phase === "rest" ? "rest" : "work"}">
                  ${timer.completed ? "Edzés kész" : timer.phase === "rest" ? "Pihenő szakasz" : "Munka szakasz"}
                </span>
              </div>

              <div class="fx-mini-note">
                ${timer.completed
                  ? "Minden kör befejezve."
                  : timer.paused
                    ? "A stopper szünetel. A „Folytatás” gombbal indítható tovább."
                    : timer.running
                      ? "Az edzés most aktív."
                      : "Nyomd meg az Indítás gombot a kezdéshez."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function ensureTimer(item) {
  if (!state.timers.has(item.id)) {
    state.timers.set(item.id, {
      exerciseId: item.id,
      phase: "work",
      running: false,
      paused: false,
      currentRound: 1,
      remainingSec: item.workSec,
      totalPhaseSec: item.workSec,
      intervalId: null,
      completed: false
    });
  }
  return state.timers.get(item.id);
}

function startExercise(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;

  const timer = ensureTimer(item);

  if (timer.completed) {
    clearExerciseInterval(timer);
    timer.phase = "work";
    timer.running = true;
    timer.paused = false;
    timer.currentRound = 1;
    timer.remainingSec = item.workSec;
    timer.totalPhaseSec = item.workSec;
    timer.completed = false;
    runTimer(item, timer);
    render();
    return;
  }

  if (timer.running && !timer.paused) return;

  timer.running = true;
  timer.paused = false;

  if (timer.remainingSec <= 0) {
    timer.phase = "work";
    timer.remainingSec = item.workSec;
    timer.totalPhaseSec = item.workSec;
  }

  runTimer(item, timer);
  render();
}

function togglePause(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;

  const timer = ensureTimer(item);
  if (timer.completed) return;

  if (!timer.running) {
    timer.running = true;
    timer.paused = false;
    runTimer(item, timer);
    render();
    return;
  }

  timer.paused = !timer.paused;
  if (timer.paused) {
    clearExerciseInterval(timer);
  } else {
    runTimer(item, timer);
  }
  render();
}

function resetExercise(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;

  const timer = ensureTimer(item);
  clearExerciseInterval(timer);

  timer.phase = "work";
  timer.running = false;
  timer.paused = false;
  timer.currentRound = 1;
  timer.remainingSec = item.workSec;
  timer.totalPhaseSec = item.workSec;
  timer.completed = false;

  render();
}

function runTimer(item, timer) {
  clearExerciseInterval(timer);

  timer.intervalId = window.setInterval(() => {
    if (timer.paused || !timer.running) return;

    timer.remainingSec -= 1;

    if (timer.remainingSec > 0) {
      render();
      return;
    }

    if (timer.phase === "work") {
      if (item.restSec > 0) {
        timer.phase = "rest";
        timer.remainingSec = item.restSec;
        timer.totalPhaseSec = item.restSec;
      } else {
        moveToNextRound(item, timer);
      }
    } else {
      moveToNextRound(item, timer);
    }

    render();
  }, 1000);
}

function moveToNextRound(item, timer) {
  if (timer.currentRound >= item.rounds) {
    clearExerciseInterval(timer);
    timer.running = false;
    timer.paused = false;
    timer.completed = true;
    timer.phase = "work";
    timer.remainingSec = 0;
    timer.totalPhaseSec = item.workSec;
    return;
  }

  timer.currentRound += 1;
  timer.phase = "work";
  timer.remainingSec = item.workSec;
  timer.totalPhaseSec = item.workSec;
}

function clearExerciseInterval(timer) {
  if (timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
}

function openDetail(id) {
  const item = state.items.find(x => x.id === id);
  if (!item || !els.detailOverlay || !els.detailBody || !els.detailTitle) return;

  const asset = getExerciseAsset(item.exerciseId || item.id || item.name);
  const displayImage = item.imageUrl || asset.image;

  els.detailTitle.textContent = item.name;
  els.detailBody.innerHTML = `
    <div class="fx-detail">
      <div class="fx-detail-media" style="background:${escapeAttr(asset.gradient || "linear-gradient(135deg, #ff4fd8, #b14cff)")};">
        <img src="${escapeAttr(displayImage)}" alt="${escapeAttr(item.name)}" />
      </div>

      <div class="fx-detail-box">
        <h3 class="fx-detail-title">${escapeHtml(item.name)}</h3>
        <p class="fx-detail-desc">${escapeHtml(item.desc)}</p>

        <div class="fx-detail-grid">
          <div class="fx-detail-stat">
            <b>Kategória</b>
            <span>${escapeHtml(item.category)}</span>
          </div>
          <div class="fx-detail-stat">
            <b>Nehézség</b>
            <span>${escapeHtml(item.difficulty)}</span>
          </div>
          <div class="fx-detail-stat">
            <b>Munkaidő</b>
            <span>${item.workSec} mp</span>
          </div>
          <div class="fx-detail-stat">
            <b>Pihenőidő</b>
            <span>${item.restSec} mp</span>
          </div>
          <div class="fx-detail-stat">
            <b>Körök</b>
            <span>${item.rounds}</span>
          </div>
          <div class="fx-detail-stat">
            <b>Ismétlés</b>
            <span>${escapeHtml(item.repsText || "Nincs megadva")}</span>
          </div>
        </div>

        <div class="fx-actions">
          <button class="fx-btn primary" type="button" id="fxDetailStartBtn" style="background:${escapeAttr(asset.gradient || "linear-gradient(135deg, #ff4fd8, #b14cff)")};">
            Indítás
          </button>
          <button class="fx-btn secondary" type="button" id="fxDetailCloseBtn">
            Bezárás
          </button>
        </div>
      </div>
    </div>
  `;

  els.detailOverlay.classList.add("is-open");
  els.detailOverlay.setAttribute("aria-hidden", "false");

  els.detailBody.querySelector("#fxDetailCloseBtn")?.addEventListener("click", closeDetail);
  els.detailBody.querySelector("#fxDetailStartBtn")?.addEventListener("click", () => {
    closeDetail();
    startExercise(item.id);
    document.getElementById("fixed-exercises")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function closeDetail() {
  if (!els.detailOverlay) return;
  els.detailOverlay.classList.remove("is-open");
  els.detailOverlay.setAttribute("aria-hidden", "true");
}

function formatSec(total) {
  const sec = Math.max(0, Number(total || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function extractAccentColor(gradient) {
  const match = String(gradient || "").match(/#([0-9a-fA-F]{3,8})/);
  return match ? `#${match[1]}` : "#ff4fd8";
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
