// FILE: /hu/app/modules/fixed-exercises-assets.js
// Fix edzések asset + vizuális mapping

export const FIXED_EXERCISE_ASSETS = {
  guggolas: {
    id: "guggolas",
    label: "Guggolás",
    image: "/hu/app/assets/exercises/guggolas.png",
    gradient: "linear-gradient(135deg, #ff4fd8, #b14cff)",
    glow: "rgba(255,79,216,0.35)"
  },

  fekvotamasz: {
    id: "fekvotamasz",
    label: "Fekvőtámasz",
    image: "/hu/app/assets/exercises/fekvotamasz.png",
    gradient: "linear-gradient(135deg, #4facfe, #00f2fe)",
    glow: "rgba(79,172,254,0.35)"
  },

  plank: {
    id: "plank",
    label: "Plank",
    image: "/hu/app/assets/exercises/plank.png",
    gradient: "linear-gradient(135deg, #43e97b, #38f9d7)",
    glow: "rgba(67,233,123,0.35)"
  },

  kitorés: {
    id: "kitores",
    label: "Kitörés",
    image: "/hu/app/assets/exercises/kitores.png",
    gradient: "linear-gradient(135deg, #fa709a, #fee140)",
    glow: "rgba(250,112,154,0.35)"
  },

  burpee: {
    id: "burpee",
    label: "Burpee",
    image: "/hu/app/assets/exercises/burpee.png",
    gradient: "linear-gradient(135deg, #f857a6, #ff5858)",
    glow: "rgba(248,87,166,0.35)"
  },

  mountain: {
    id: "mountain",
    label: "Mountain climber",
    image: "/hu/app/assets/exercises/mountain.png",
    gradient: "linear-gradient(135deg, #30cfd0, #330867)",
    glow: "rgba(48,207,208,0.35)"
  }
};

// fallback (ha nincs mapping)
export const DEFAULT_EXERCISE_ASSET = {
  image: "/hu/app/assets/exercises/default.png",
  gradient: "linear-gradient(135deg, #555, #222)",
  glow: "rgba(255,255,255,0.15)"
};

// helper
export function getExerciseAsset(key) {
  if (!key) return DEFAULT_EXERCISE_ASSET;

  const normalized = String(key)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\w]/g, "");

  return FIXED_EXERCISE_ASSETS[normalized] || DEFAULT_EXERCISE_ASSET;
}
