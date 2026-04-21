// FILE: /hu/admin/modules/admin-upgrades.js

export default function initAdminUpgrades() {
  console.log("🚀 Admin upgrades init...");

  injectMenuItem();
  injectFixExercisesPage();
}

// ------------------------------
// 🧭 Menü bővítés
// ------------------------------
function injectMenuItem() {
  const menu = document.querySelector("aside, .menu, nav");

  if (!menu) {
    console.warn("⚠️ Menü nem található");
    return;
  }

  if (document.querySelector("#menu-fix-exercises")) return;

  const btn = document.createElement("button");
  btn.id = "menu-fix-exercises";
  btn.innerText = "💪 Fix edzések";
  btn.style.marginTop = "10px";
  btn.style.width = "100%";

  btn.onclick = () => {
    openFixExercisesPage();
  };

  menu.appendChild(btn);
}

// ------------------------------
// 📦 UI beszúrás
// ------------------------------
function injectFixExercisesPage() {
  if (document.querySelector("#fix-exercises-page")) return;

  const container = document.createElement("div");
  container.id = "fix-exercises-page";
  container.style.display = "none";
  container.style.padding = "20px";

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2>💪 Fix edzések</h2>
      <button id="add-exercise-btn">+ Új edzés</button>
    </div>

    <div id="exercise-list" style="margin-top:20px;"></div>
  `;

  document.body.appendChild(container);

  document.getElementById("add-exercise-btn").onclick = createNewExercise;

  loadExercises();
}

// ------------------------------
// 📂 Megnyitás
// ------------------------------
function openFixExercisesPage() {
  hideAllSections();

  const page = document.getElementById("fix-exercises-page");
  if (page) page.style.display = "block";
}

// ------------------------------
// 🔒 Régi oldalak elrejtése
// ------------------------------
function hideAllSections() {
  document.querySelectorAll("main, section, .page").forEach(el => {
    el.style.display = "none";
  });
}

// ------------------------------
// 📥 Betöltés (mock)
// ------------------------------
function loadExercises() {
  const list = document.getElementById("exercise-list");

  if (!list) return;

  list.innerHTML = `
    <div style="padding:20px;border:1px solid #333;border-radius:12px;">
      <strong>Guggolás</strong><br/>
      40 mp munka / 20 mp pihenő / 3 kör
    </div>
  `;
}

// ------------------------------
// ➕ Új edzés
// ------------------------------
function createNewExercise() {
  alert("Új edzés létrehozása (következő lépésben Firestore)");
}
