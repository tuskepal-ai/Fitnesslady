import { db, fs } from "../../shared/firebase.js";
import { FIXED_EXERCISE_IMAGE_FILES, FIXED_EXERCISE_IMAGE_URLS, FIXED_EXERCISE_TEMPLATES_HU } from "../../shared/fixed-exercises-data.js";

const EXERCISES_COL = "fixedExerciseTemplates";
const USER_ASSIGN_SUBCOL = "fixedExercises";
const CANONICAL_EXERCISE_IDS = new Set(FIXED_EXERCISE_TEMPLATES_HU.map((item) => item.id));
const EXERCISE_ASSET_VERSION = "fixed-exercises-20260426";
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

const FALLBACK_EXERCISES_HU = [
  {
    id: "guggolas",
    name: "Guggolás",
    desc: "Alsótest erősítés, fókuszban a comb és a farizom.",
    category: "Alsótest",
    workSec: 40,
    restSec: 20,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "közepes",
    active: true,
    sortOrder: 1
  },
  {
    id: "fekvotamasz",
    name: "Fekvőtámasz",
    desc: "Mell, váll és tricepsz erősítése. Figyelj a stabil törzsre.",
    category: "Felsőtest",
    workSec: 30,
    restSec: 15,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "közepes",
    active: true,
    sortOrder: 2
  },
  {
    id: "plank",
    name: "Plank",
    desc: "Törzs stabilizálás és core erősítés. Egyenes testtartással tartsd.",
    category: "Hasizom",
    workSec: 45,
    restSec: 15,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "könnyű",
    active: true,
    sortOrder: 3
  },
  {
    id: "kitores",
    name: "Kitörés",
    desc: "Comb és farizom fejlesztése, váltott lábbal, kontrollált mozgással.",
    category: "Alsótest",
    workSec: 35,
    restSec: 20,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "közepes",
    active: true,
    sortOrder: 4
  },
  {
    id: "mountain-climber",
    name: "Mountain Climber",
    desc: "Állóképesség és core. Tartsd feszesen a törzset gyors tempó mellett is.",
    category: "Kardió",
    workSec: 30,
    restSec: 15,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "közepes",
    active: true,
    sortOrder: 5
  },
  {
    id: "burpee",
    name: "Burpee",
    desc: "Teljes testes gyakorlat, magas pulzus és erős metabolikus terhelés.",
    category: "Teljes test",
    workSec: 40,
    restSec: 20,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "nehéz",
    active: true,
    sortOrder: 6
  },
  {
    id: "Csípő emelés",
    name: "Csípőemelés",
    desc: "Farizom aktiválás és alsótest stabilitás. Lassú, kontrollált emeléssel.",
    category: "Farizom",
    workSec: 40,
    restSec: 20,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "könnyű",
    active: true,
    sortOrder: 7
  },
  {
    id: "oldalemeles",
    name: "Oldalemelés",
    desc: "Váll izoláció. Kis súllyal, kontrollált emeléssel dolgozz.",
    category: "Váll",
    workSec: 35,
    restSec: 15,
    rounds: 3,
    repsText: "12 ismétlés",
    type: "nem-videós",
    difficulty: "közepes",
    active: true,
    sortOrder: 8
  },
  {
    id: "biciklis-haspres",
    name: "Biciklis hasprés",
    desc: "Ferde hasizmok és teljes core bekapcsolása váltott könyök-térd mozgással.",
    category: "Hasizom",
    workSec: 40,
    restSec: 15,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "közepes",
    active: true,
    sortOrder: 9
  },
  {
    id: "jumping-jack",
    name: "Jumping Jack",
    desc: "Bemelegítéshez vagy rövid kardió blokkhoz. Könnyű, pörgős mozgás.",
    category: "Kardió",
    workSec: 30,
    restSec: 10,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "könnyű",
    active: true,
    sortOrder: 10
  },
  {
    id: "labemeles-fekve",
    name: "Lábemelés fekve",
    desc: "Alsó has fókuszú gyakorlat, lassú visszaengedéssel.",
    category: "Hasizom",
    workSec: 35,
    restSec: 15,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "közepes",
    active: true,
    sortOrder: 11
  },
  {
    id: "vadli-emeles",
    name: "Vádli emelés",
    desc: "Vádli erősítése álló helyzetben, teljes mozgástartománnyal.",
    category: "Alsótest",
    workSec: 30,
    restSec: 15,
    rounds: 4,
    repsText: "15 ismétlés",
    type: "nem-videós",
    difficulty: "könnyű",
    active: true,
    sortOrder: 12
  },
  {
    id: "oldalso-terdemeles",
    name: "Oldalsó térdemelés",
    desc: "Oldalsó core és csípő aktiválás, lassú és kontrollált kivitelezéssel.",
    category: "Core",
    workSec: 30,
    restSec: 15,
    rounds: 3,
    repsText: "",
    type: "nem-videós",
    difficulty: "könnyű",
    active: true,
    sortOrder: 13
  },
  {
    id: "szek-tamaszos-tricepsz",
    name: "Szék támaszos tricepsz",
    desc: "Tricepsz erősítés otthoni környezetben, székkel vagy paddal.",
    category: "Kar",
    workSec: 30,
    restSec: 20,
    rounds: 3,
    repsText: "10 ismétlés",
    type: "nem-videós",
    difficulty: "közepes",
    active: true,
    sortOrder: 14
  },
  {
    id: "vall-korzes",
    name: "Vállkörzés",
    desc: "Bemelegítő vállmobilizáció, könnyű átmozgatás edzés elejére.",
    category: "Bemelegítés",
    workSec: 25,
    restSec: 10,
    rounds: 2,
    repsText: "",
    type: "nem-videós",
    difficulty: "könnyű",
    active: true,
    sortOrder: 15
  },
  {
  id: "konnyu-ulesbol-felallas",
  name: "Könnyű ülésből felállás",
  desc: "Segít az alsótest erősítésében anélkül, hogy túlterhelné az ízületeket. Ülj le egy stabil székre, a talpak legyenek a talajon. Lassan állj fel, majd kontrolláltan ülj vissza. Használd a kezed segítségként, ha szükséges. Végezd nyugodt tempóban, fájdalom nélkül.",
  category: "Kímélő erősítés",
  workSec: 30,
  restSec: 30,
  rounds: 2,
  repsText: "6-8 ismétlés",
  type: "nem-videós",
  difficulty: "könnyű",
  active: true,
  sortOrder: 99
}
];

const IMAGE_MAP = {
  "guggolas": "guggolas.png",
  "fekvotamasz": "fekvotamasz.png",
  "plank": "plank.png",
  "kitores": "kitores.png",
  "mountain-climber": "mountain-climber.png",
  "burpee": "mountain-climber.png",
  "mountainclimber": "mountain-climber.png",
  "hegymaszo": "mountain-climber.png",
  "csipoemeles": "csipoemeles.png",
  "csipo-emeles": "csipoemeles.png",
  "glute-bridge": "csipoemeles.png",
  "glutebridge": "csipoemeles.png",
  "oldalemeles": "oldalemeles.png",
  "biciklis-haspres": "biciklis-haspres.png",
  "jumping-jack": "terpesz-zar.png",
  "jumpingjack": "terpesz-zar.png",
  "labemeles-fekve": "labemeles-fekve.png",
  "vadli-emeles": "vadli-emeles.png",
  "oldalso-terdemeles": "oldalso-terdemeles.png",
  "szek-tamaszos-tricepsz": "szek-tricepsz.png",
  "szek-tricepsz": "szek-tricepsz.png",
  "vall-korzes": "vallkorzes.png", 
  "vallkorzes": "vallkorzes.png",
  "konnyu-ulesbol-felallas": "konnyu-ulesbol-felallas.png",
};

const state = {
  booted: false,
  exercises: [],
  users: [],
  filteredUsers: [],
  selectedExerciseId: "",
  editingId: "",
  filters: {
    search: "",
    category: "",
    difficulty: "",
    type: "",
    active: ""
  }
};

export default async function initAdminUpgrades() {
  if (state.booted) return;
  state.booted = true;

  try {
    injectStyles();
    installImageFallbackHandler();
    injectOverlay();
    injectLauncher();
    bindStaticEvents();

    await Promise.all([
      ensureSeedExercises(),
      loadUsers()
    ]);

    await loadExercises();
    resetForm();
    renderCategoryFilter();
    renderEditSelect();
    renderExercises();
    renderAssignedUsersPanel();

    console.log("✅ Fix edzések modul aktív");
  } catch (e) {
    console.error("❌ initAdminUpgrades hiba:", e);
    safeFallbackLauncher();
  }
}

function normalizeExerciseKey(value) {
  return slugify(String(value || "").trim());
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

    const normalized = normalizeExerciseKey(raw);
    if (CANONICAL_EXERCISE_IDS.has(normalized)) return normalized;
    if (CANONICAL_EXERCISE_ALIASES[normalized]) return CANONICAL_EXERCISE_ALIASES[normalized];
  }

  return "";
}

function resolveImage(id, manualUrl = "") {
  const cleanManual = String(manualUrl || "").trim();
  if (cleanManual) return cleanManual;

  const rawId = getCanonicalExerciseId(id) || String(id || "").trim();
  const file =
    FIXED_EXERCISE_IMAGE_FILES[rawId] ||
    FIXED_EXERCISE_IMAGE_FILES[normalizeExerciseKey(rawId)] ||
    IMAGE_MAP[rawId] ||
    IMAGE_MAP[normalizeExerciseKey(rawId)];
  if (!file) return "";

  return `/hu/app/assets/exercises/${file}`;
}

function getMappedExerciseImage(id) {
  const rawId = getCanonicalExerciseId(id) || String(id || "").trim();
  const normalized = normalizeExerciseKey(rawId);
  return (
    FIXED_EXERCISE_IMAGE_URLS[rawId] ||
    FIXED_EXERCISE_IMAGE_URLS[normalized] ||
    resolveImage(rawId, "")
  );
}

function withExerciseAssetVersion(url) {
  const clean = String(url || "").trim();
  if (!clean) return "";
  if (!clean.startsWith("/hu/app/assets/exercises/")) return clean;
  if (clean.includes("?")) return clean;
  return `${clean}?v=${EXERCISE_ASSET_VERSION}`;
}

function getDisplayImageSources(id, manualUrl = "") {
  const candidates = [
    String(manualUrl || "").trim(),
    getMappedExerciseImage(id),
    resolveImage(id, "")
  ].filter(Boolean);

  const unique = [];
  for (const candidate of candidates) {
    const versioned = withExerciseAssetVersion(candidate);
    if (versioned && !unique.includes(versioned)) unique.push(versioned);
    if (candidate && candidate !== versioned && !unique.includes(candidate)) unique.push(candidate);
  }
  return unique;
}

function installImageFallbackHandler() {
  window.__fitnessLadyFixedImageFallback = (img) => {
    const parent = img?.parentNode;
    let fallbacks = [];
    try {
      fallbacks = JSON.parse(img.dataset.fallbackSrcs || "[]");
    } catch {
      fallbacks = [];
    }

    const next = fallbacks.shift();
    if (next) {
      img.dataset.fallbackSrcs = JSON.stringify(fallbacks);
      img.src = next;
      return;
    }

    if (parent) {
      parent.innerHTML = '<div class="fx-thumb-empty">Nincs kép</div>';
    }
  };
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

    #fx-floating-wrap{
      position:fixed;
      right:16px;
      bottom:16px;
      z-index:9998;
      width:min(260px, calc(100vw - 32px));
      display:none;
    }
    #fx-floating-wrap.show{
      display:block;
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
      background:
        linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025)),
        rgba(12,9,18,.82);
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
      grid-template-columns:repeat(4, minmax(150px, 1fr));
      gap:10px;
      margin-bottom:14px;
      padding:12px;
      border-radius:20px;
      border:1px solid rgba(255,255,255,.07);
      background:rgba(0,0,0,.18);
    }
    .fx-toolbar #fxSearch{
      grid-column:span 2;
    }
    .fx-toolbar .fx-btn{
      min-height:42px;
      padding:0 13px;
      white-space:nowrap;
      font-size:12.5px;
    }
    @media (max-width: 980px){
      .fx-toolbar{ grid-template-columns:1fr; }
      .fx-toolbar #fxSearch{ grid-column:auto; }
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
      color-scheme:dark;
    }
    .fx-input,
    .fx-select{ min-height:46px; padding:0 14px; }
    .fx-select{
      cursor:pointer;
      background:
        linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.035)),
        #140d1f;
    }
    .fx-select option,
    .fx-select optgroup{
      background:#140d1f;
      color:#fff;
    }
    .fx-select:focus,
    .fx-input:focus,
    .fx-textarea:focus{
      border-color:rgba(255,79,216,.42);
      box-shadow:0 0 0 3px rgba(255,79,216,.12);
    }
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
      gap:14px;
    }

    .fx-item{
      display:grid;
      grid-template-columns:96px minmax(0, 1fr);
      gap:14px;
      align-items:start;
      padding:14px 14px 12px;
      border-radius:22px;
      border:1px solid rgba(255,255,255,.08);
      background:
        radial-gradient(280px 150px at 10% 0%, rgba(255,79,216,.10), transparent 60%),
        rgba(0,0,0,.22);
      transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease;
    }
    .fx-item:hover{
      border-color:rgba(255,79,216,.22);
      box-shadow:0 18px 42px rgba(0,0,0,.24);
    }
    @media (max-width: 840px){
      .fx-item{ grid-template-columns:1fr; }
    }

    .fx-thumb{
      width:96px;
      height:96px;
      border-radius:20px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
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
    .fx-thumb-empty{
      width:100%;
      height:100%;
      display:flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      padding:10px;
      color:rgba(255,255,255,.45);
      font-size:12px;
      font-weight:800;
      line-height:1.35;
    }

    .fx-title{
      font-size:20px;
      font-weight:900;
      margin-bottom:6px;
      line-height:1.1;
    }
    .fx-desc{
      color:rgba(255,255,255,.72);
      font-size:13px;
      line-height:1.5;
      margin-bottom:10px;
      max-width:70ch;
    }
    .fx-meta{
      display:flex;
      flex-wrap:wrap;
      gap:7px;
    }
    .fx-chip{
      display:inline-flex;
      align-items:center;
      padding:7px 10px;
      border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
      color:rgba(255,255,255,.88);
      font-size:11.5px;
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
      justify-content:flex-start;
      grid-column:2 / -1;
      padding-top:2px;
    }
    .fx-actions .fx-btn{
      min-height:38px;
      padding:0 12px;
      border-radius:999px;
      font-size:12px;
    }
    @media (max-width: 840px){
      .fx-actions{ grid-column:auto; }
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

  const mount = document.getElementById("fxLauncherMount");
  if (mount) {
    mount.innerHTML = "";
    mount.appendChild(btn);
    return;
  }

  safeFallbackLauncher(btn);
}

function safeFallbackLauncher(existingBtn = null) {
  let wrap = document.getElementById("fx-floating-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "fx-floating-wrap";
    document.body.appendChild(wrap);
  }
  wrap.classList.add("show");

  if (!existingBtn && !document.getElementById("fx-launcher")) {
    const btn = document.createElement("button");
    btn.id = "fx-launcher";
    btn.type = "button";
    btn.innerHTML = `<span>💪</span><span>Fix edzések</span>`;
    btn.addEventListener("click", openOverlay);
    wrap.innerHTML = "";
    wrap.appendChild(btn);
    return;
  }

  if (existingBtn) {
    wrap.innerHTML = "";
    wrap.appendChild(existingBtn);
  }
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
              <select class="fx-select" id="fxCategoryFilter">
                <option value="">Kategória: összes</option>
              </select>
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
              <button class="fx-btn" id="fxSeedBtn" type="button">Alap edzések frissítése</button>
              <button class="fx-btn danger" id="fxCleanupBtn" type="button">Duplák / kép nélküliek törlése</button>
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
                Gyors edzés választó
                <select class="fx-select" id="fxEditSelect">
                  <option value="">+ Új edzés létrehozása</option>
                </select>
              </label>

              <label class="fx-label">
                Név
                <input class="fx-input" id="fxName" type="text" placeholder="pl. Guggolás" />
              </label>

              <label class="fx-label">
                Leírás
                <textarea class="fx-textarea" id="fxDesc" placeholder="pl. Alsótest erősítés, comb és farizom fókusz."></textarea>
              </label>

              <label class="fx-label">
                Részletek / helyes kivitelezés
                <textarea class="fx-textarea" id="fxGuide" placeholder="Rövid, érthető instrukció: hogyan kezdje, mire figyeljen, mi legyen kontrollált."></textarea>
              </label>

              <div class="fx-grid-2">
                <label class="fx-label">
                  Kategória
                  <input class="fx-input" id="fxCategory" type="text" placeholder="pl. Alsótest" />
                </label>

                <label class="fx-label">
                  Kép URL
                  <input class="fx-input" id="fxImage" type="text" placeholder="/hu/app/assets/exercises/guggolas.png" />
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

  document.getElementById("fxCategoryFilter")?.addEventListener("change", (e) => {
    state.filters.category = String(e.target.value || "").trim();
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
  document.getElementById("fxSeedBtn")?.addEventListener("click", refreshSeedExercises);
  document.getElementById("fxCleanupBtn")?.addEventListener("click", cleanupDuplicateExercises);
  document.getElementById("fxEditSelect")?.addEventListener("change", (e) => {
    const id = String(e.target.value || "").trim();
    if (id) startEdit(id);
    else resetForm();
  });

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

async function ensureSeedExercises({ overwrite = false } = {}) {
  const snap = await fs.getDocs(fs.collection(db, EXERCISES_COL));
  const existingById = new Map(snap.docs.map(d => [d.id, d.data() || {}]));

  for (const item of FIXED_EXERCISE_TEMPLATES_HU) {
    const existing = existingById.get(item.id);
    const seedPayload = {
      ...item,
      imageUrl: resolveImage(item.id, item.imageUrl || ""),
      seedVersion: 2
    };

    const docRef = fs.doc(db, EXERCISES_COL, item.id);

    if (!existing) {
      await fs.setDoc(docRef, {
        ...seedPayload,
        createdAt: fs.serverTimestamp(),
        updatedAt: fs.serverTimestamp()
      });
      continue;
    }

    const patch = {};
    for (const [key, value] of Object.entries(seedPayload)) {
      const current = existing[key];
      if (overwrite || current === undefined || current === null || current === "") {
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length) {
      await fs.setDoc(docRef, {
        ...patch,
        updatedAt: fs.serverTimestamp()
      }, { merge: true });
    }
  }
}

async function refreshSeedExercises() {
  const ok = confirm(
    "Frissítsem az alap fix edzés adatbázist?\n\nEz a beépített edzésneveket, képeket, leírásokat és részletes útmutatókat is ráírja a fixedExerciseTemplates kollekcióra."
  );
  if (!ok) return;

  try {
    await ensureSeedExercises({ overwrite: true });
    await loadExercises();
    resetForm();
    renderCategoryFilter();
    renderEditSelect();
    renderExercises();
    alert("Az alap fix edzések frissítve.");
  } catch (e) {
    console.error(e);
    alert(`Seed frissítési hiba: ${extractErrorMessage(e)}`);
  }
}

async function cleanupDuplicateExercises() {
  const ok = confirm(
    "Végleg töröljem a duplikált vagy kép nélküli fix edzéseket?\n\nMegmaradnak a képpel rendelkező fő edzések és a képpel rendelkező saját edzések. A régi duplák és kép nélküli rekordok törlődnek a Firestore-ból."
  );
  if (!ok) return;

  try {
    await ensureSeedExercises({ overwrite: true });

    const snap = await fs.getDocs(fs.collection(db, EXERCISES_COL));
    const seenCanonicalIds = new Set();
    const canonicalTemplateById = new Map(FIXED_EXERCISE_TEMPLATES_HU.map((item) => [item.id, item]));
    let deletedCount = 0;
    let fixedCount = 0;

    const docs = snap.docs
      .map((docSnap) => ({
        docSnap,
        id: docSnap.id,
        data: docSnap.data() || {}
      }))
      .sort((a, b) => {
        const ac = getCanonicalExerciseId({ id: a.id, ...a.data }) || a.id;
        const bc = getCanonicalExerciseId({ id: b.id, ...b.data }) || b.id;
        const canon = ac.localeCompare(bc, "hu");
        if (canon) return canon;
        const aCanonicalDoc = CANONICAL_EXERCISE_IDS.has(a.id) ? 0 : 1;
        const bCanonicalDoc = CANONICAL_EXERCISE_IDS.has(b.id) ? 0 : 1;
        if (aCanonicalDoc !== bCanonicalDoc) return aCanonicalDoc - bCanonicalDoc;
        return String(a.data.name || a.id).localeCompare(String(b.data.name || b.id), "hu");
      });

    for (const entry of docs) {
      const canonicalId = getCanonicalExerciseId({ id: entry.id, ...entry.data });
      const template = canonicalTemplateById.get(canonicalId);
      const hasImage = !!resolveImage(canonicalId || entry.id, entry.data.imageUrl || template?.imageUrl || "");
      const shouldKeepCanonical = !!template && hasImage && !seenCanonicalIds.has(canonicalId) && entry.id === canonicalId;
      const shouldKeepCustom = !canonicalId && hasImage;

      if (shouldKeepCanonical) {
        seenCanonicalIds.add(canonicalId);
        await fs.setDoc(entry.docSnap.ref, {
          ...template,
          imageUrl: resolveImage(canonicalId, template.imageUrl || ""),
          active: true,
          archived: false,
          duplicateOf: "",
          cleanupReason: "",
          updatedAt: fs.serverTimestamp()
        }, { merge: true });
        fixedCount += 1;
        continue;
      }

      if (shouldKeepCustom) {
        fixedCount += 1;
        continue;
      }

      await fs.deleteDoc(entry.docSnap.ref);
      deletedCount += 1;
    }

    await loadExercises();
    resetForm();
    renderCategoryFilter();
    renderEditSelect();
    renderExercises();
    alert(`Kész. Megmaradt képes edzés: ${fixedCount}. Törölt régi/hibás rekord: ${deletedCount}.`);
  } catch (e) {
    console.error(e);
    alert(`Törlési hiba: ${extractErrorMessage(e)}`);
  }
}

async function loadExercises() {
  try {
    const snap = await fs.getDocs(fs.collection(db, EXERCISES_COL));
    const uniqueByCanonicalId = new Map();
    const rawItems = snap.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() || {})
      }))
      .filter((item) => item.archived !== true)
      .filter((item) => item.active !== false)
      .sort((a, b) => {
        const ac = getCanonicalExerciseId(a) || a.id;
        const bc = getCanonicalExerciseId(b) || b.id;
        const canon = ac.localeCompare(bc, "hu");
        if (canon) return canon;
        const aCanonicalDoc = CANONICAL_EXERCISE_IDS.has(a.id) ? 0 : 1;
        const bCanonicalDoc = CANONICAL_EXERCISE_IDS.has(b.id) ? 0 : 1;
        return aCanonicalDoc - bCanonicalDoc;
      });

    for (const item of rawItems) {
      const canonicalId = getCanonicalExerciseId(item);
      const dedupeKey = canonicalId || String(item.id || "").trim();
      if (!dedupeKey || uniqueByCanonicalId.has(dedupeKey)) continue;

      const imageUrl = resolveImage(canonicalId || item.id, item.imageUrl || "");
      if (!imageUrl) continue;

      uniqueByCanonicalId.set(dedupeKey, {
        ...item,
        imageUrl
      });
    }

    state.exercises = [...uniqueByCanonicalId.values()];
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
    const docId = state.editingId || slugify(payload.name);

    if (!payload.name) return alert("Az edzés neve kötelező.");
    if (!payload.desc) return alert("A leírás kötelező.");
    if (!payload.guide) return alert("A részletek / helyes kivitelezés mező kötelező.");
    if (!payload.category) return alert("A kategória kötelező.");
    if (payload.workSec < 0) return alert("A munkaidő legyen 0 vagy nagyobb.");
    if (payload.restSec < 0) return alert("A pihenőidő legyen 0 vagy nagyobb.");
    if (payload.rounds < 1) return alert("A körök száma minimum 1.");

    payload.imageUrl = resolveImage(docId, payload.imageUrl);

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
    renderCategoryFilter();
    renderEditSelect();
    renderExercises();
    alert("Mentve.");
  } catch (e) {
    console.error(e);
    alert(`Mentési hiba: ${extractErrorMessage(e)}`);
  }
}

async function deleteExercise(exerciseId) {
  const item = state.exercises.find((x) => x.id === exerciseId);
  if (!confirm(`Biztosan inaktiválod ezt az edzést?\n\n${item?.name || "Ismeretlen edzés"}\n\nNem törlődik végleg, csak nem lesz aktív.`)) return;

  try {
    await fs.setDoc(fs.doc(db, EXERCISES_COL, exerciseId), {
      active: false,
      updatedAt: fs.serverTimestamp()
    }, { merge: true });
    await loadExercises();
    renderCategoryFilter();
    renderEditSelect();
    renderExercises();
    if (state.editingId === exerciseId) resetForm();
  } catch (e) {
    console.error(e);
    alert(`Inaktiválási hiba: ${extractErrorMessage(e)}`);
  }
}

async function assignExerciseToUser(uid, exerciseId) {
  try {
    const item = state.exercises.find((x) => x.id === exerciseId);
    if (!item) return;

    const finalImageUrl = resolveImage(item.id, item.imageUrl || "");

    await fs.setDoc(
      fs.doc(db, "users", uid, USER_ASSIGN_SUBCOL, exerciseId),
      {
        exerciseId,
        templateRef: `${EXERCISES_COL}/${exerciseId}`,
        name: item.name || "",
        desc: item.desc || "",
        guide: item.guide || item.instructions || item.details || "",
        category: item.category || "",
        imageUrl: finalImageUrl,
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

function renderCategoryFilter() {
  const select = document.getElementById("fxCategoryFilter");
  if (!select) return;

  const selected = state.filters.category;
  const categories = [...new Set(
    state.exercises
      .map((x) => String(x.category || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "hu"));

  select.innerHTML = [
    `<option value="">Kategória: összes</option>`,
    ...categories.map((category) => (
      `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    ))
  ].join("");

  select.value = categories.includes(selected) ? selected : "";
  state.filters.category = select.value;
}

function renderEditSelect() {
  const select = document.getElementById("fxEditSelect");
  if (!select) return;

  const groups = new Map();
  [...state.exercises]
    .sort((a, b) => {
      const ac = String(a.category || "Általános");
      const bc = String(b.category || "Általános");
      const cat = ac.localeCompare(bc, "hu");
      if (cat) return cat;
      const ao = Number(a.sortOrder || 0);
      const bo = Number(b.sortOrder || 0);
      if (ao !== bo) return ao - bo;
      return String(a.name || "").localeCompare(String(b.name || ""), "hu");
    })
    .forEach((item) => {
      const category = String(item.category || "Általános").trim();
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    });

  const options = [`<option value="">+ Új edzés létrehozása</option>`];
  groups.forEach((items, category) => {
    options.push(`<optgroup label="${escapeHtml(category)}">`);
    items.forEach((item) => {
      const inactive = item.active === false ? " · inaktív" : "";
      options.push(`<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.id)}${inactive}</option>`);
    });
    options.push(`</optgroup>`);
  });

  select.innerHTML = options.join("");
  select.value = state.editingId || "";
}

function renderExercises() {
  const list = document.getElementById("fxExerciseList");
  if (!list) return;

  const items = getFilteredExercises();

  if (!items.length) {
    list.innerHTML = `<div class="fx-empty">Nincs találat vagy a kollekció még üres.</div>`;
    return;
  }

  list.innerHTML = items.map((item) => {
    const imageSources = getDisplayImageSources(item.id, item.imageUrl || "");
    const finalImageUrl = imageSources[0] || "";
    const fallbackSources = imageSources.slice(1);

    return `
      <div class="fx-item">
        <div class="fx-thumb">
          ${
            finalImageUrl
              ? `<img src="${escapeHtml(finalImageUrl)}" alt="${escapeHtml(item.name)}" data-fallback-srcs="${escapeHtml(JSON.stringify(fallbackSources))}" onerror="window.__fitnessLadyFixedImageFallback?.(this)" />`
              : `<div class="fx-thumb-empty">Nincs kép</div>`
          }
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
          <button class="fx-btn danger" type="button" data-fx-del="${item.id}">Inaktiválás</button>
        </div>
      </div>
    `;
  }).join("");

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
  setVal("fxGuide", item.guide || item.instructions || item.details || "");
  setVal("fxCategory", item.category || "");
  setVal("fxImage", resolveImage(item.id, item.imageUrl || ""));
  setVal("fxWork", Number(item.workSec || 0));
  setVal("fxRest", Number(item.restSec || 0));
  setVal("fxRounds", Number(item.rounds || 1));
  setVal("fxReps", item.repsText || "");
  setVal("fxType", item.type || "nem-videós");
  setVal("fxDifficulty", item.difficulty || "közepes");
  setVal("fxSortOrder", Number(item.sortOrder || 0));

  const active = document.getElementById("fxActive");
  if (active) active.checked = item.active !== false;

  const editSelect = document.getElementById("fxEditSelect");
  if (editSelect) editSelect.value = item.id;
}

function resetForm() {
  state.editingId = "";
  setVal("fxName", "");
  setVal("fxDesc", "");
  setVal("fxGuide", "");
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

  const editSelect = document.getElementById("fxEditSelect");
  if (editSelect) editSelect.value = "";
}

function getFormPayload() {
  return {
    name: String(getVal("fxName")).trim(),
    desc: String(getVal("fxDesc")).trim(),
    guide: String(getVal("fxGuide")).trim(),
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
  const category = state.filters.category;
  const difficulty = state.filters.difficulty;
  const type = state.filters.type;
  const active = state.filters.active;

  return [...state.exercises]
    .filter((x) => {
      const hay = [
        x.name,
        x.desc,
        x.guide,
        x.instructions,
        x.details,
        x.category,
        x.type,
        x.difficulty
      ].map((v) => String(v || "").toLowerCase()).join(" ");

      if (search && !hay.includes(search)) return false;
      if (category && String(x.category || "") !== category) return false;
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
