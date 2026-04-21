import { db, fs } from "../../shared/firebase.js";
import { FIXED_EXERCISES_HU } from "./fixed-exercises.data.js";

const EXERCISES_COL = "fixedExerciseTemplates";
const USER_ASSIGN_SUBCOL = "fixedExercises";

const state = {
  booted: false,
  exercises: [],
  users: [],
  filteredUsers: [],
  selectedExerciseId: "",
  editingId: "",
  filters: {
    search: "",
    difficulty: "",
    type: "",
    active: ""
  }
};

export default async function initAdminUpgrades() {
  if (state.booted) return;
  state.booted = true;

  injectStyles();
  injectLauncher();
  injectOverlay();
  bindStaticEvents();

  await Promise.all([
    ensureSeedExercises(),
    loadUsers()
  ]);

  await loadExercises();
  resetForm();
  renderExercises();
  renderAssignedUsersPanel();
}

function injectStyles() {
  if (document.getElementById("fx-inline-style")) return;

  const style = document.createElement("style");
  style.id = "fx-inline-style";
  style.textContent = `
    #fx-launcher{
      display:flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      width:100%;
      margin-top:10px;
      padding:14px 16px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.10);
      background:linear-gradient(180deg, rgba(255,79,216,.16), rgba(177,76,255,.08));
      color:#fff;
      font:inherit;
      font-weight:900;
      cursor:pointer;
      box-shadow:0 14px 32px rgba(0,0,0,.28);
    }
    #fx-launcher:hover{
      border-color:rgba(255,255,255,.18);
      background:linear-gradient(180deg, rgba(255,79,216,.22), rgba(177,76,255,.12));
    }

    #fx-overlay{
      position:fixed;
      inset:0;
      z-index:99999;
      background:rgba(5,3,10,.72);
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
      display:none;
      align-items:center;
      justify-content:center;
      padding:18px;
    }
    #fx-overlay.is-open{ display:flex; }

    #fx-modal{
      width:min(1380px, 98vw);
      max-height:94vh;
      overflow:auto;
      border-radius:28px;
      border:1px solid rgba(255,255,255,.10);
      background:
        radial-gradient(1200px 380px at 10% 0%, rgba(255,79,216,.13), transparent 55%),
        radial-gradient(1200px 380px at 90% 10%, rgba(177,76,255,.10), transparent 55%),
        #090711;
      color:#fff;
      box-shadow:0 30px 120px rgba(0,0,0,.60);
    }

    #fx-head{
      position:sticky;
      top:0;
      z-index:5;
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      padding:22px 24px;
      border-bottom:1px solid rgba(255,255,255,.08);
      background:rgba(10,8,16,.92);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }
    #fx-head h2{
      margin:0;
      font-size:30px;
      line-height:1.08;
      font-family:ui-serif, Georgia, serif;
    }
    #fx-head p{
      margin:8px 0 0;
      color:rgba(255,255,255,.70);
      font-size:14px;
      line-height:1.55;
    }

    #fx-close{
      width:42px;
      height:42px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.06);
      color:#fff;
      font:inherit;
      font-size:18px;
      cursor:pointer;
      flex:0 0 auto;
    }

    #fx-body{
      padding:22px;
      display:grid;
      grid-template-columns:1.35fr .9fr;
      gap:18px;
      align-items:start;
    }
    @media (max-width: 1120px){
      #fx-body{ grid-template-columns:1fr; }
    }

    .fx-card{
      border:1px solid rgba(255,255,255,.08);
      border-radius:24px;
      background:rgba(255,255,255,.035);
      box-shadow:0 18px 44px rgba(0,0,0,.20);
      overflow:hidden;
    }
    .fx-card-body{ padding:18px; }
    .fx-card-head{ padding:18px 18px 0; }
    .fx-card h3{
      margin:0 0 8px;
      font-size:22px;
      font-family:ui-serif, Georgia, serif;
    }
    .fx-sub{
      color:rgba(255,255,255,.68);
      font-size:13px;
      line-height:1.5;
      margin-bottom:14px;
    }

    .fx-error{
      margin-bottom:14px;
      padding:14px 16px;
      border-radius:16px;
      border:1px solid rgba(255,120,140,.18);
      background:rgba(255,80,110,.12);
      color:#ffdbe2;
      font-size:13px;
      line-height:1.55;
    }

    .fx-toolbar{
      display:grid;
      grid-template-columns:1.1fr .7fr .7fr .7fr auto;
      gap:10px;
      margin-bottom:14px;
    }
    @media (max-width: 980px){
      .fx-toolbar{ grid-template-columns:1fr; }
    }

    .fx-input,
    .fx-select,
    .fx-textarea{
      width:100%;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.05);
      color:#fff;
      font:inherit;
      outline:none;
    }
    .fx-input,
    .fx-select{ min-height:46px; padding:0 14px; }
    .fx-textarea{
      min-height:110px;
      resize:vertical;
      padding:12px 14px;
    }
    .fx-input::placeholder,
    .fx-textarea::placeholder{
      color:rgba(255,255,255,.35);
    }

    .fx-btn{
      min-height:46px;
      padding:0 16px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.07);
      color:#fff;
      font:inherit;
      font-weight:900;
      cursor:pointer;
      transition:.18s ease;
    }
    .fx-btn:hover{
      transform:translateY(-1px);
      border-color:rgba(255,255,255,.18);
    }
    .fx-btn.primary{
      background:linear-gradient(135deg, #ff4fd8, #b14cff);
      color:#180a17;
      border-color:transparent;
    }
    .fx-btn.danger{
      background:rgba(255,80,110,.10);
      border-color:rgba(255,80,110,.22);
      color:#ffd9df;
    }

    .fx-list{
      display:grid;
      gap:12px;
    }

    .fx-item{
      display:grid;
      grid-template-columns:110px 1fr auto;
      gap:14px;
      align-items:center;
      padding:14px;
      border-radius:20px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(0,0,0,.20);
    }
    @media (max-width: 840px){
      .fx-item{ grid-template-columns:1fr; }
    }

    .fx-thumb{
      width:110px;
      height:110px;
      border-radius:18px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.08);
      background:linear-gradient(180deg, rgba(255,79,216,.18), rgba(177,76,255,.10));
      display:flex;
      align-items:center;
      justify-content:center;
      flex:0 0 auto;
    }
    .fx-thumb img{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }

    .fx-title{
      font-size:22px;
      font-weight:900;
      margin-bottom:6px;
      line-height:1.1;
    }
    .fx-desc{
      color:rgba(255,255,255,.72);
      font-size:13px;
      line-height:1.5;
      margin-bottom:10px;
    }
    .fx-meta{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
    }
    .fx-chip{
      display:inline-flex;
      align-items:center;
      padding:7px 10px;
      border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
      color:rgba(255,255,255,.88);
      font-size:12px;
      font-weight:900;
    }
    .fx-chip.ok{
      background:rgba(121,247,186,.10);
      border-color:rgba(121,247,186,.20);
      color:#e0fff0;
    }
    .fx-chip.off{
      background:rgba(255,128,151,.10);
      border-color:rgba(255,128,151,.18);
      color:#ffe1e7;
    }

    .fx-actions{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      justify-content:flex-end;
    }

    .fx-label{
      display:grid;
      gap:6px;
      color:rgba(255,255,255,.82);
      font-size:12px;
      font-weight:900;
    }
    .fx-grid-2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }
    @media (max-width: 760px){
      .fx-grid-2{ grid-template-columns:1fr; }
    }

    .fx-switch-row{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:12px 14px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
    }
    .fx-switch-row span{
      color:rgba(255,255,255,.82);
      font-size:13px;
      font-weight:800;
    }

    .fx-check{
      width:22px;
      height:22px;
      accent-color:#ff4fd8;
    }

    .fx-form-actions{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      margin-top:4px;
    }

    .fx-assign-list{
      display:grid;
      gap:10px;
      margin-top:12px;
      max-height:340px;
      overflow:auto;
    }
    .fx-user{
      display:grid;
      grid-template-columns:1fr auto;
      gap:10px;
      align-items:center;
      padding:12px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(0,0,0,.20);
    }
    .fx-user strong{
      display:block;
      margin-bottom:4px;
      font-size:14px;
    }
    .fx-user span{
      display:block;
      color:rgba(255,255,255,.62);
      font-size:12px;
      line-height:1.45;
    }

    .fx-empty{
      padding:18px;
      border-radius:16px;
      border:1px dashed rgba(255,255,255,.14);
      color:rgba(255,255,255,.60);
      text-align:center;
      background:rgba(255,255,255,.03);
    }

    .fx-note{
      padding:12px 14px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      color:rgba(255,255,255,.68);
      font-size:12px;
      line-height:1.55;
    }
  `;
  document.head.appendChild(style);
}

function injectLauncher() {
  if (document.getElementById("fx-launcher")) return;

  const btn = document.createElement("button");
  btn.id = "fx-launcher";
  btn.type = "button";
  btn.innerHTML = `<span>💪</span><span>Fix edzések</span>`;
  btn.addEventListener("click", openOverlay);

  if (tryInsertIntoMenu(btn)) return;

  const fallback = document.createElement("div");
  fallback.style.position = "fixed";
  fallback.style.left = "16px";
  fallback.style.right = "16px";
  fallback.style.bottom = "16px";
  fallback.style.zIndex = "9998";
  fallback.appendChild(btn);
  document.body.appendChild(fallback);
}

function tryInsertIntoMenu(btn) {
  const menuItems = Array.from(document.querySelectorAll("button, a, div")).filter((el) => {
    const txt = (el.textContent || "").trim().toLowerCase();
    return [
      "felhasználók",
      "plan template",
      "étrend",
      "motiváció",
      "személyre szabás",
      "technika vault"
    ].includes(txt);
  });

  if (menuItems.length) {
    menuItems[menuItems.length - 1].insertAdjacentElement("afterend", btn);
    return true;
  }

  const menuBlock = Array.from(document.querySelectorAll("div, section, aside")).find((el) => {
    const txt = (el.textContent || "").toLowerCase();
    return txt.includes("menü") && txt.includes("felhasználók") && txt.includes("plan template");
  });

  if (menuBlock) {
    menuBlock.appendChild(btn);
    return true;
  }

  return false;
}

function injectOverlay() {
  if (document.getElementById("fx-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "fx-overlay";
  overlay.innerHTML = `
    <div id="fx-modal">
      <div id="fx-head">
        <div>
          <h2>Fix edzések</h2>
          <p>Előre megírt, képes, szerkeszthető fix edzések kezelése. A meglévő admin funkciók érintetlenek maradnak.</p>
        </div>
        <button id="fx-close" type="button">✕</button>
      </div>

      <div id="fx-body">
        <div class="fx-card">
          <div class="fx-card-head">
            <h3>Edzéslista</h3>
            <div class="fx-sub">Itt látod az összes fix edzést. Kereshető, szűrhető, szerkeszthető és userhez rendelhető.</div>
          </div>
          <div class="fx-card-body">
            <div id="fxErrorBox"></div>

            <div class="fx-toolbar">
              <input class="fx-input" id="fxSearch" type="text" placeholder="Keresés névre, leírásra, kategóriára..." />
              <select class="fx-select" id="fxDifficultyFilter">
                <option value="">Nehézség: összes</option>
                <option value="könnyű">Könnyű</option>
                <option value="közepes">Közepes</option>
                <option value="nehéz">Nehéz</option>
              </select>
              <select class="fx-select" id="fxTypeFilter">
                <option value="">Típus: összes</option>
                <option value="videós">Videós</option>
                <option value="nem-videós">Nem videós</option>
              </select>
              <select class="fx-select" id="fxActiveFilter">
                <option value="">Állapot: összes</option>
                <option value="active">Aktív</option>
                <option value="inactive">Inaktív</option>
              </select>
              <button class="fx-btn primary" id="fxNewBtn" type="button">+ Új</button>
            </div>

            <div class="fx-list" id="fxExerciseList"></div>
          </div>
        </div>

        <div style="display:grid; gap:18px;">
          <div class="fx-card">
            <div class="fx-card-head">
              <h3>Edzés szerkesztése</h3>
              <div class="fx-sub">Új fix edzés létrehozása vagy meglévő módosítása.</div>
            </div>
            <div class="fx-card-body" style="display:grid; gap:10px;">
              <label class="fx-label">
                Név
                <input class="fx-input" id="fxName" type="text" placeholder="pl. Guggolás" />
              </label>

              <label class="fx-label">
                Leírás
                <textarea class="fx-textarea" id="fxDesc" placeholder="pl. Alsótest erősítés, comb és farizom fókusz."></textarea>
              </label>

              <div class="fx-grid-2">
                <label class="fx-label">
                  Kategória
                  <input class="fx-input" id="fxCategory" type="text" placeholder="pl. Alsótest" />
                </label>

                <label class="fx-label">
                  Kép URL
                  <input class="fx-input" id="fxImage" type="text" placeholder="https://..." />
                </label>
              </div>

              <div class="fx-grid-2">
                <label class="fx-label">
                  Munkaidő (mp)
                  <input class="fx-input" id="fxWork" type="number" min="0" placeholder="40" />
                </label>

                <label class="fx-label">
                  Pihenőidő (mp)
                  <input class="fx-input" id="fxRest" type="number" min="0" placeholder="20" />
                </label>
              </div>

              <div class="fx-grid-2">
                <label class="fx-label">
                  Körök száma
                  <input class="fx-input" id="fxRounds" type="number" min="1" placeholder="3" />
                </label>

                <label class="fx-label">
                  Ismétlések (opcionális)
                  <input class="fx-input" id="fxReps" type="text" placeholder="pl. 12 ismétlés" />
                </label>
              </div>

              <div class="fx-grid-2">
                <label class="fx-label">
                  Típus
                  <select class="fx-select" id="fxType">
                    <option value="videós">Videós</option>
                    <option value="nem-videós">Nem videós</option>
                  </select>
                </label>

                <label class="fx-label">
                  Nehézség
                  <select class="fx-select" id="fxDifficulty">
                    <option value="könnyű">Könnyű</option>
                    <option value="közepes">Közepes</option>
                    <option value="nehéz">Nehéz</option>
                  </select>
                </label>
              </div>

              <div class="fx-grid-2">
                <label class="fx-label">
                  Sorrend
                  <input class="fx-input" id="fxSortOrder" type="number" min="0" placeholder="1" />
                </label>

                <div class="fx-switch-row">
                  <span>Aktív és választható legyen</span>
                  <input class="fx-check" id="fxActive" type="checkbox" checked />
                </div>
              </div>

              <div class="fx-form-actions">
                <button class="fx-btn primary" id="fxSaveBtn" type="button">Mentés</button>
                <button class="fx-btn" id="fxResetBtn" type="button">Űrlap törlése</button>
              </div>

              <div class="fx-note">
                A mentés a <strong>fixedExerciseTemplates</strong> Firestore kollekcióba történik.
              </div>
            </div>
          </div>

          <div class="fx-card">
            <div class="fx-card-head">
              <h3>Hozzárendelés felhasználóhoz</h3>
              <div class="fx-sub">A kiválasztott fix edzést userhez lehet rendelni. A hozzárendelés külön a user saját adatán tárolódik.</div>
            </div>
            <div class="fx-card-body">
              <label class="fx-label">
                Felhasználó keresése
                <input class="fx-input" id="fxUserSearch" type="text" placeholder="név / email / uid" />
              </label>

              <div class="fx-assign-list" id="fxUserList"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function bindStaticEvents() {
  document.getElementById("fx-close")?.addEventListener("click", closeOverlay);
  document.getElementById("fx-overlay")?.addEventListener("click", (e) => {
    if (e.target?.id === "fx-overlay") closeOverlay();
  });

  document.getElementById("fxSearch")?.addEventListener("input", (e) => {
    state.filters.search = String(e.target.value || "").trim().toLowerCase();
    renderExercises();
  });

  document.getElementById("fxDifficultyFilter")?.addEventListener("change", (e) => {
    state.filters.difficulty = e.target.value;
    renderExercises();
  });

  document.getElementById("fxTypeFilter")?.addEventListener("change", (e) => {
    state.filters.type = e.target.value;
    renderExercises();
  });

  document.getElementById("fxActiveFilter")?.addEventListener("change", (e) => {
    state.filters.active = e.target.value;
    renderExercises();
  });

  document.getElementById("fxNewBtn")?.addEventListener("click", resetForm);
  document.getElementById("fxResetBtn")?.addEventListener("click", resetForm);
  document.getElementById("fxSaveBtn")?.addEventListener("click", saveExercise);

  document.getElementById("fxUserSearch")?.addEventListener("input", (e) => {
    filterUsers(String(e.target.value || ""));
  });
}

function openOverlay() {
  document.getElementById("fx-overlay")?.classList.add("is-open");
}

function closeOverlay() {
  document.getElementById("fx-overlay")?.classList.remove("is-open");
}

async function ensureSeedExercises() {
  const snap = await fs.getDocs(fs.collection(db, EXERCISES_COL));
  if (!snap.empty) return;

  for (const item of FIXED_EXERCISES_HU) {
    const docRef = fs.doc(db, EXERCISES_COL, item.id);
    await fs.setDoc(docRef, {
      ...item,
      imageUrl: makeExerciseArt(item.name, item.category, item.difficulty),
      createdAt: fs.serverTimestamp(),
      updatedAt: fs.serverTimestamp()
    });
  }
}

async function loadExercises() {
  try {
    const snap = await fs.getDocs(fs.collection(db, EXERCISES_COL));
    state.exercises = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() || {})
    }));
    renderError("");
  } catch (e) {
    console.error(e);
    state.exercises = [];
    renderError("A fix edzések nem tölthetők be. Ellenőrizd a Firestore rules-t a fixedExerciseTemplates útvonalra.");
  }
}

async function loadUsers() {
  try {
    const snap = await fs.getDocs(fs.collection(db, "users"));
    state.users = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() || {})
    }));
    state.filteredUsers = [...state.users];
  } catch (e) {
    console.error(e);
    state.users = [];
    state.filteredUsers = [];
  }
}

async function saveExercise() {
  try {
    const payload = getFormPayload();

    if (!payload.name) return alert("Az edzés neve kötelező.");
    if (!payload.desc) return alert("A leírás kötelező.");
    if (!payload.category) return alert("A kategória kötelező.");
    if (payload.workSec < 0) return alert("A munkaidő legyen 0 vagy nagyobb.");
    if (payload.restSec < 0) return alert("A pihenőidő legyen 0 vagy nagyobb.");
    if (payload.rounds < 1) return alert("A körök száma minimum 1.");

    if (!payload.imageUrl) {
      payload.imageUrl = makeExerciseArt(payload.name, payload.category, payload.difficulty);
    }

    const docId = state.editingId || slugify(payload.name);

    await fs.setDoc(
      fs.doc(db, EXERCISES_COL, docId),
      {
        ...payload,
        updatedAt: fs.serverTimestamp(),
        ...(state.editingId ? {} : { createdAt: fs.serverTimestamp() })
      },
      { merge: true }
    );

    await loadExercises();
    resetForm();
    renderExercises();
    alert("Mentve.");
  } catch (e) {
    console.error(e);
    alert(`Mentési hiba: ${extractErrorMessage(e)}`);
  }
}

async function deleteExercise(exerciseId) {
  const item = state.exercises.find((x) => x.id === exerciseId);
  if (!confirm(`Biztosan törlöd ezt az edzést?\n\n${item?.name || "Ismeretlen edzés"}`)) return;

  try {
    await fs.deleteDoc(fs.doc(db, EXERCISES_COL, exerciseId));
    await loadExercises();
    renderExercises();
    if (state.editingId === exerciseId) resetForm();
  } catch (e) {
    console.error(e);
    alert(`Törlési hiba: ${extractErrorMessage(e)}`);
  }
}

async function assignExerciseToUser(uid, exerciseId) {
  try {
    const item = state.exercises.find((x) => x.id === exerciseId);
    if (!item) return;

    await fs.setDoc(
      fs.doc(db, "users", uid, USER_ASSIGN_SUBCOL, exerciseId),
      {
        exerciseId,
        templateRef: `${EXERCISES_COL}/${exerciseId}`,
        name: item.name || "",
        desc: item.desc || "",
        category: item.category || "",
        imageUrl: item.imageUrl || "",
        workSec: Number(item.workSec || 0),
        restSec: Number(item.restSec || 0),
        rounds: Number(item.rounds || 1),
        repsText: item.repsText || "",
        type: item.type || "nem-videós",
        difficulty: item.difficulty || "közepes",
        active: item.active !== false,
        sortOrder: Number(item.sortOrder || 0),
        assignedAt: fs.serverTimestamp(),
        updatedAt: fs.serverTimestamp()
      },
      { merge: true }
    );

    alert("Edzés hozzárendelve.");
  } catch (e) {
    console.error(e);
    alert(`Hozzárendelési hiba: ${extractErrorMessage(e)}`);
  }
}

async function removeExerciseFromUser(uid, exerciseId) {
  try {
    await fs.deleteDoc(fs.doc(db, "users", uid, USER_ASSIGN_SUBCOL, exerciseId));
    alert("Edzés eltávolítva a felhasználótól.");
  } catch (e) {
    console.error(e);
    alert(`Eltávolítási hiba: ${extractErrorMessage(e)}`);
  }
}

function renderExercises() {
  const list = document.getElementById("fxExerciseList");
  if (!list) return;

  const items = getFilteredExercises();

  if (!items.length) {
    list.innerHTML = `<div class="fx-empty">Nincs találat vagy a kollekció még üres.</div>`;
    return;
  }

  list.innerHTML = items.map((item) => `
    <div class="fx-item">
      <div class="fx-thumb">
        <img src="${escapeHtml(item.imageUrl || makeExerciseArt(item.name, item.category, item.difficulty))}" alt="${escapeHtml(item.name)}" />
      </div>

      <div>
        <div class="fx-title">${escapeHtml(item.name || "—")}</div>
        <div class="fx-desc">${escapeHtml(item.desc || "")}</div>

        <div class="fx-meta">
          <span class="fx-chip">${Number(item.workSec || 0)} mp munka</span>
          <span class="fx-chip">${Number(item.restSec || 0)} mp pihenő</span>
          <span class="fx-chip">${Number(item.rounds || 1)} kör</span>
          ${item.repsText ? `<span class="fx-chip">${escapeHtml(item.repsText)}</span>` : ""}
          <span class="fx-chip">${escapeHtml(item.category || "Általános")}</span>
          <span class="fx-chip">${escapeHtml(item.difficulty || "közepes")}</span>
          <span class="fx-chip">${escapeHtml(item.type || "nem-videós")}</span>
          <span class="fx-chip ${item.active !== false ? "ok" : "off"}">${item.active !== false ? "Aktív" : "Inaktív"}</span>
        </div>
      </div>

      <div class="fx-actions">
        <button class="fx-btn" type="button" data-fx-edit="${item.id}">Szerk.</button>
        <button class="fx-btn" type="button" data-fx-assign="${item.id}">Hozzárendelés</button>
        <button class="fx-btn danger" type="button" data-fx-del="${item.id}">Törlés</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll("[data-fx-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.getAttribute("data-fx-edit")));
  });

  list.querySelectorAll("[data-fx-assign]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedExerciseId = btn.getAttribute("data-fx-assign") || "";
      renderAssignedUsersPanel();
      document.getElementById("fxUserSearch")?.focus();
    });
  });

  list.querySelectorAll("[data-fx-del]").forEach((btn) => {
    btn.addEventListener("click", () => deleteExercise(btn.getAttribute("data-fx-del")));
  });
}

function renderAssignedUsersPanel() {
  const wrap = document.getElementById("fxUserList");
  if (!wrap) return;

  const exercise = state.exercises.find((x) => x.id === state.selectedExerciseId);

  if (!exercise) {
    wrap.innerHTML = `<div class="fx-empty">Először válassz ki egy edzést a listából a „Hozzárendelés” gombbal.</div>`;
    return;
  }

  const items = state.filteredUsers.length ? state.filteredUsers : state.users;

  if (!items.length) {
    wrap.innerHTML = `<div class="fx-empty">Nincs felhasználó.</div>`;
    return;
  }

  wrap.innerHTML = items.map((u) => {
    const displayName =
      String(u.name || "").trim() ||
      String(u.fullName || "").trim() ||
      String(u.email || "").trim() ||
      u.id;

    const email = String(u.email || "").trim();
    const planId = String(u.planId || "").trim();

    return `
      <div class="fx-user">
        <div>
          <strong>${escapeHtml(displayName)}</strong>
          <span>${escapeHtml(email || "nincs email")}</span>
          <span>uid: ${escapeHtml(u.id)}${planId ? ` • planId: ${escapeHtml(planId)}` : ""}</span>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="fx-btn primary" type="button" data-fx-user-add="${u.id}">Hozzáadás</button>
          <button class="fx-btn danger" type="button" data-fx-user-remove="${u.id}">Levétel</button>
        </div>
      </div>
    `;
  }).join("");

  wrap.querySelectorAll("[data-fx-user-add]").forEach((btn) => {
    btn.addEventListener("click", () => assignExerciseToUser(btn.getAttribute("data-fx-user-add"), exercise.id));
  });

  wrap.querySelectorAll("[data-fx-user-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeExerciseFromUser(btn.getAttribute("data-fx-user-remove"), exercise.id));
  });
}

function startEdit(id) {
  const item = state.exercises.find((x) => x.id === id);
  if (!item) return;

  state.editingId = item.id;

  setVal("fxName", item.name || "");
  setVal("fxDesc", item.desc || "");
  setVal("fxCategory", item.category || "");
  setVal("fxImage", item.imageUrl || "");
  setVal("fxWork", Number(item.workSec || 0));
  setVal("fxRest", Number(item.restSec || 0));
  setVal("fxRounds", Number(item.rounds || 1));
  setVal("fxReps", item.repsText || "");
  setVal("fxType", item.type || "nem-videós");
  setVal("fxDifficulty", item.difficulty || "közepes");
  setVal("fxSortOrder", Number(item.sortOrder || 0));

  const active = document.getElementById("fxActive");
  if (active) active.checked = item.active !== false;
}

function resetForm() {
  state.editingId = "";
  setVal("fxName", "");
  setVal("fxDesc", "");
  setVal("fxCategory", "");
  setVal("fxImage", "");
  setVal("fxWork", 40);
  setVal("fxRest", 20);
  setVal("fxRounds", 3);
  setVal("fxReps", "");
  setVal("fxType", "nem-videós");
  setVal("fxDifficulty", "közepes");
  setVal("fxSortOrder", state.exercises.length + 1);

  const active = document.getElementById("fxActive");
  if (active) active.checked = true;
}

function getFormPayload() {
  return {
    name: String(getVal("fxName")).trim(),
    desc: String(getVal("fxDesc")).trim(),
    category: String(getVal("fxCategory")).trim(),
    imageUrl: String(getVal("fxImage")).trim(),
    workSec: Number(getVal("fxWork") || 0),
    restSec: Number(getVal("fxRest") || 0),
    rounds: Number(getVal("fxRounds") || 1),
    repsText: String(getVal("fxReps")).trim(),
    type: String(getVal("fxType") || "nem-videós").trim(),
    difficulty: String(getVal("fxDifficulty") || "közepes").trim(),
    sortOrder: Number(getVal("fxSortOrder") || 0),
    active: !!document.getElementById("fxActive")?.checked
  };
}

function filterUsers(q) {
  const s = String(q || "").trim().toLowerCase();
  if (!s) {
    state.filteredUsers = [...state.users];
    renderAssignedUsersPanel();
    return;
  }

  state.filteredUsers = state.users.filter((u) => {
    const hay = [
      u.id,
      u.name,
      u.fullName,
      u.email,
      u.planId
    ].map((x) => String(x || "").toLowerCase()).join(" ");
    return hay.includes(s);
  });

  renderAssignedUsersPanel();
}

function getFilteredExercises() {
  const search = state.filters.search;
  const difficulty = state.filters.difficulty;
  const type = state.filters.type;
  const active = state.filters.active;

  return [...state.exercises]
    .filter((x) => {
      const hay = [
        x.name,
        x.desc,
        x.category,
        x.type,
        x.difficulty
      ].map((v) => String(v || "").toLowerCase()).join(" ");

      if (search && !hay.includes(search)) return false;
      if (difficulty && String(x.difficulty || "").toLowerCase() !== difficulty) return false;
      if (type && String(x.type || "").toLowerCase() !== type) return false;
      if (active === "active" && x.active === false) return false;
      if (active === "inactive" && x.active !== false) return false;

      return true;
    })
    .sort((a, b) => {
      const ao = Number(a.sortOrder || 0);
      const bo = Number(b.sortOrder || 0);
      if (ao !== bo) return ao - bo;
      return String(a.name || "").localeCompare(String(b.name || ""), "hu");
    });
}

function renderError(message) {
  const box = document.getElementById("fxErrorBox");
  if (!box) return;
  box.innerHTML = message ? `<div class="fx-error">${escapeHtml(message)}</div>` : "";
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function getVal(id) {
  return document.getElementById(id)?.value ?? "";
}

function extractErrorMessage(e) {
  return e?.message || String(e);
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeExerciseArt(name, category, difficulty) {
  const palette = {
    könnyű: ["#8d5cff", "#ff4fd8"],
    közepes: ["#ff4fd8", "#ff8a5b"],
    nehéz: ["#ff5b7f", "#ff2f5b"]
  };

  const [c1, c2] = palette[difficulty] || palette.közepes;
  const title = escapeSvg(name);
  const sub = escapeSvg(category);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="700" viewBox="0 0 700 700">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
        <radialGradient id="r" cx="25%" cy="18%" r="70%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.28)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <rect width="700" height="700" rx="42" fill="#120d1b"/>
      <rect x="18" y="18" width="664" height="664" rx="34" fill="url(#g)" opacity="0.18"/>
      <circle cx="120" cy="110" r="160" fill="url(#r)"/>
      <rect x="44" y="44" width="612" height="612" rx="28" fill="none" stroke="rgba(255,255,255,0.10)"/>
      <text x="54" y="500" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="800" fill="white">${title}</text>
      <text x="56" y="560" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="rgba(255,255,255,0.82)">${sub}</text>
      <circle cx="560" cy="160" r="88" fill="url(#g)" opacity="0.85"/>
      <circle cx="560" cy="160" r="62" fill="#130c1b" opacity="0.88"/>
      <text x="560" y="170" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="white">FL</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
