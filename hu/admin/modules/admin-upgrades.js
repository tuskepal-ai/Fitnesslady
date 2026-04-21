// FILE: /hu/admin/modules/admin-upgrades.js

export default function initAdminUpgrades() {
  console.log("🚀 Admin upgrades init...");

  injectStyles();
  injectFixExercisesEntry();
  injectFixExercisesPanel();
}

function injectStyles() {
  if (document.getElementById("admin-upgrades-inline-style")) return;

  const style = document.createElement("style");
  style.id = "admin-upgrades-inline-style";
  style.textContent = `
    #fix-exercises-launcher{
      display:flex;
      align-items:center;
      gap:10px;
      width:100%;
      margin-top:10px;
      padding:14px 16px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.10);
      background:linear-gradient(180deg, rgba(255,79,216,.14), rgba(177,76,255,.08));
      color:#fff;
      font:inherit;
      font-weight:800;
      cursor:pointer;
      box-shadow:0 10px 30px rgba(0,0,0,.25);
    }
    #fix-exercises-launcher:hover{
      border-color:rgba(255,255,255,.18);
      background:linear-gradient(180deg, rgba(255,79,216,.18), rgba(177,76,255,.10));
    }
    #fix-exercises-overlay{
      position:fixed;
      inset:0;
      z-index:9999;
      background:rgba(3,2,8,.72);
      backdrop-filter:blur(8px);
      display:none;
      align-items:center;
      justify-content:center;
      padding:18px;
    }
    #fix-exercises-overlay.is-open{
      display:flex;
    }
    #fix-exercises-modal{
      width:min(1200px, 96vw);
      max-height:92vh;
      overflow:auto;
      border-radius:24px;
      border:1px solid rgba(255,255,255,.10);
      background:
        radial-gradient(900px 300px at 10% 0%, rgba(255,79,216,.12), transparent 55%),
        radial-gradient(900px 300px at 90% 10%, rgba(177,76,255,.09), transparent 55%),
        #0a0810;
      color:#fff;
      box-shadow:0 30px 120px rgba(0,0,0,.55);
    }
    #fix-exercises-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:20px 22px;
      border-bottom:1px solid rgba(255,255,255,.08);
      position:sticky;
      top:0;
      background:rgba(10,8,16,.92);
      backdrop-filter:blur(10px);
      z-index:2;
    }
    #fix-exercises-head h2{
      margin:0;
      font-size:28px;
      line-height:1.1;
    }
    #fix-exercises-head p{
      margin:6px 0 0;
      color:rgba(255,255,255,.70);
      font-size:14px;
    }
    #fix-exercises-close{
      width:42px;
      height:42px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.06);
      color:#fff;
      font:inherit;
      font-size:18px;
      cursor:pointer;
    }
    #fix-exercises-body{
      padding:22px;
      display:grid;
      grid-template-columns:1.35fr .9fr;
      gap:18px;
    }
    @media (max-width: 980px){
      #fix-exercises-body{
        grid-template-columns:1fr;
      }
    }
    .fx-card{
      border:1px solid rgba(255,255,255,.08);
      border-radius:22px;
      background:rgba(255,255,255,.04);
      padding:18px;
    }
    .fx-card h3{
      margin:0 0 8px;
      font-size:20px;
    }
    .fx-sub{
      color:rgba(255,255,255,.68);
      font-size:13px;
      line-height:1.5;
      margin-bottom:14px;
    }
    .fx-toolbar{
      display:grid;
      grid-template-columns:1.2fr .8fr .8fr auto;
      gap:10px;
      margin-bottom:14px;
    }
    @media (max-width: 900px){
      .fx-toolbar{
        grid-template-columns:1fr;
      }
    }
    .fx-input, .fx-select{
      width:100%;
      min-height:44px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.05);
      color:#fff;
      padding:0 14px;
      font:inherit;
      outline:none;
    }
    .fx-btn{
      min-height:44px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.07);
      color:#fff;
      font:inherit;
      font-weight:800;
      cursor:pointer;
      padding:0 16px;
    }
    .fx-btn.primary{
      border-color:transparent;
      background:linear-gradient(135deg, #ff4fd8, #b14cff);
      color:#170916;
    }
    .fx-list{
      display:grid;
      gap:12px;
    }
    .fx-item{
      display:grid;
      grid-template-columns:96px 1fr auto;
      gap:14px;
      align-items:center;
      padding:14px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(0,0,0,.20);
    }
    @media (max-width: 760px){
      .fx-item{
        grid-template-columns:1fr;
      }
    }
    .fx-thumb{
      width:96px;
      height:96px;
      border-radius:16px;
      background:linear-gradient(180deg, rgba(255,79,216,.20), rgba(177,76,255,.10));
      border:1px solid rgba(255,255,255,.08);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:34px;
    }
    .fx-title{
      font-size:18px;
      font-weight:900;
      margin-bottom:6px;
    }
    .fx-desc{
      color:rgba(255,255,255,.70);
      font-size:13px;
      line-height:1.45;
      margin-bottom:8px;
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
      font-weight:800;
    }
    .fx-actions{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      justify-content:flex-end;
    }
    .fx-form{
      display:grid;
      gap:10px;
    }
    .fx-grid-2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }
    @media (max-width: 760px){
      .fx-grid-2{
        grid-template-columns:1fr;
      }
    }
    .fx-label{
      display:grid;
      gap:6px;
      color:rgba(255,255,255,.80);
      font-size:12px;
      font-weight:800;
    }
    .fx-textarea{
      min-height:100px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.05);
      color:#fff;
      padding:12px 14px;
      font:inherit;
      resize:vertical;
      outline:none;
    }
    .fx-empty{
      padding:18px;
      border-radius:16px;
      border:1px dashed rgba(255,255,255,.14);
      color:rgba(255,255,255,.60);
      text-align:center;
    }
  `;
  document.head.appendChild(style);
}

function injectFixExercisesEntry() {
  if (document.getElementById("fix-exercises-launcher")) return;

  const button = document.createElement("button");
  button.id = "fix-exercises-launcher";
  button.type = "button";
  button.innerHTML = `<span>💪</span><span>Fix edzések</span>`;
  button.addEventListener("click", openFixExercisesModal);

  const inserted = tryInsertIntoExistingMenu(button);
  if (inserted) {
    console.log("✅ Fix edzések menüpont beszúrva");
    return;
  }

  const fallbackWrap = document.createElement("div");
  fallbackWrap.style.position = "fixed";
  fallbackWrap.style.left = "16px";
  fallbackWrap.style.right = "16px";
  fallbackWrap.style.bottom = "16px";
  fallbackWrap.style.zIndex = "9998";
  fallbackWrap.appendChild(button);
  document.body.appendChild(fallbackWrap);

  console.warn("⚠️ Menühely nem volt biztosan felismerhető, fallback gomb lett kirakva");
}

function tryInsertIntoExistingMenu(button) {
  const menuHints = Array.from(document.querySelectorAll("button, a, div")).filter((el) => {
    const txt = (el.textContent || "").trim().toLowerCase();
    return txt === "felhasználók"
      || txt === "plan template"
      || txt === "étrend"
      || txt === "motiváció"
      || txt === "személyre szabás"
      || txt === "technika vault";
  });

  if (menuHints.length) {
    const lastMenuItem = menuHints[menuHints.length - 1];
    lastMenuItem.insertAdjacentElement("afterend", button);
    return true;
  }

  const menuCard = Array.from(document.querySelectorAll("div, section, aside")).find((el) => {
    const txt = (el.textContent || "").toLowerCase();
    return txt.includes("menü") &&
           txt.includes("felhasználók") &&
           txt.includes("plan template");
  });

  if (menuCard) {
    menuCard.appendChild(button);
    return true;
  }

  return false;
}

function injectFixExercisesPanel() {
  if (document.getElementById("fix-exercises-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "fix-exercises-overlay";
  overlay.innerHTML = `
    <div id="fix-exercises-modal">
      <div id="fix-exercises-head">
        <div>
          <h2>Fix edzések</h2>
          <p>Itt lesznek az előre megírt, képes, szerkeszthető fix edzések. A meglévő admin funkciókhoz nem nyúl.</p>
        </div>
        <button id="fix-exercises-close" type="button">✕</button>
      </div>

      <div id="fix-exercises-body">
        <div class="fx-card">
          <h3>Edzéslista</h3>
          <div class="fx-sub">Előre megírt edzések, képpel, munkaidővel, pihenővel, körrel, nehézséggel.</div>

          <div class="fx-toolbar">
            <input class="fx-input" id="fxSearch" type="text" placeholder="Keresés edzésre..." />
            <select class="fx-select" id="fxDifficulty">
              <option value="">Nehézség: összes</option>
              <option value="könnyű">Könnyű</option>
              <option value="közepes">Közepes</option>
              <option value="nehéz">Nehéz</option>
            </select>
            <select class="fx-select" id="fxType">
              <option value="">Típus: összes</option>
              <option value="videós">Videós</option>
              <option value="nem-videós">Nem videós</option>
            </select>
            <button class="fx-btn primary" id="fxAddBtn" type="button">+ Új</button>
          </div>

          <div class="fx-list" id="fxExerciseList"></div>
        </div>

        <div class="fx-card">
          <h3>Edzés szerkesztése</h3>
          <div class="fx-sub">Ez most az alap kezelőpanel. Következő körben rákötjük a teljes Firestore mentésre.</div>

          <div class="fx-form">
            <label class="fx-label">
              Név
              <input class="fx-input" id="fxName" type="text" placeholder="pl. Guggolás" />
            </label>

            <label class="fx-label">
              Leírás
              <textarea class="fx-textarea" id="fxDesc" placeholder="pl. Alsótest erősítés, comb és farizom fókusz"></textarea>
            </label>

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
                Típus
                <select class="fx-select" id="fxMode">
                  <option value="videós">Videós</option>
                  <option value="nem-videós">Nem videós</option>
                </select>
              </label>
            </div>

            <div class="fx-grid-2">
              <label class="fx-label">
                Nehézség
                <select class="fx-select" id="fxLevel">
                  <option value="könnyű">Könnyű</option>
                  <option value="közepes">Közepes</option>
                  <option value="nehéz">Nehéz</option>
                </select>
              </label>

              <label class="fx-label">
                Kép URL
                <input class="fx-input" id="fxImage" type="text" placeholder="https://..." />
              </label>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px;">
              <button class="fx-btn primary" id="fxSaveBtn" type="button">Mentés</button>
              <button class="fx-btn" id="fxResetBtn" type="button">Űrlap törlése</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeFixExercisesModal();
  });

  document.getElementById("fix-exercises-close").addEventListener("click", closeFixExercisesModal);
  document.getElementById("fxAddBtn").addEventListener("click", resetExerciseForm);
  document.getElementById("fxResetBtn").addEventListener("click", resetExerciseForm);
  document.getElementById("fxSaveBtn").addEventListener("click", () => {
    alert("Ez most a stabil UI alap. Következő körben rákötjük a teljes éles mentésre a meglévő admin rendszerbe.");
  });

  renderExerciseList(getSeedExercises());
}

function openFixExercisesModal() {
  const overlay = document.getElementById("fix-exercises-overlay");
  if (overlay) overlay.classList.add("is-open");
}

function closeFixExercisesModal() {
  const overlay = document.getElementById("fix-exercises-overlay");
  if (overlay) overlay.classList.remove("is-open");
}

function resetExerciseForm() {
  const ids = ["fxName", "fxDesc", "fxWork", "fxRest", "fxRounds", "fxImage"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const fxMode = document.getElementById("fxMode");
  const fxLevel = document.getElementById("fxLevel");
  if (fxMode) fxMode.value = "videós";
  if (fxLevel) fxLevel.value = "közepes";
}

function renderExerciseList(items) {
  const list = document.getElementById("fxExerciseList");
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<div class="fx-empty">Nincs még fix edzés.</div>`;
    return;
  }

  list.innerHTML = items.map((item) => `
    <div class="fx-item">
      <div class="fx-thumb">${item.icon}</div>

      <div>
        <div class="fx-title">${escapeHtml(item.name)}</div>
        <div class="fx-desc">${escapeHtml(item.desc)}</div>
        <div class="fx-meta">
          <span class="fx-chip">${item.work}s munka</span>
          <span class="fx-chip">${item.rest}s pihenő</span>
          <span class="fx-chip">${item.rounds} kör</span>
          <span class="fx-chip">${escapeHtml(item.level)}</span>
          <span class="fx-chip">${escapeHtml(item.mode)}</span>
        </div>
      </div>

      <div class="fx-actions">
        <button class="fx-btn" type="button">Szerk.</button>
        <button class="fx-btn" type="button">Hozzárendelés</button>
      </div>
    </div>
  `).join("");
}

function getSeedExercises() {
  return [
    {
      name: "Guggolás",
      desc: "Alsótest erősítés, comb és farizom fókusz.",
      work: 40,
      rest: 20,
      rounds: 3,
      level: "közepes",
      mode: "nem-videós",
      icon: "🏋️"
    },
    {
      name: "Fekvőtámasz",
      desc: "Mell, váll és tricepsz erősítése.",
      work: 30,
      rest: 15,
      rounds: 3,
      level: "közepes",
      mode: "nem-videós",
      icon: "💪"
    },
    {
      name: "Plank",
      desc: "Törzs stabilizálás és core erősítés.",
      work: 45,
      rest: 15,
      rounds: 3,
      level: "könnyű",
      mode: "nem-videós",
      icon: "🔥"
    }
  ];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
