import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_ID = "fitneady-15fd0";
const COLLECTION = "fixedExerciseTemplates";
const FIREBASE_CLIENT_ID = "563584335869-nr68opn5h28bnqf2gg7b2b3868d5h2f3.apps.googleusercontent.com";
const FIREBASE_CLIENT_SECRET = "jmfazcNcXPmLGN8XG5NcrI";

const rootDir = path.resolve(import.meta.dirname, "..");
const dataFile = path.join(rootDir, "hu", "shared", "fixed-exercises-data.js");

async function importExerciseData() {
  const source = await fs.promises.readFile(dataFile, "utf8");
  const moduleSource = source.replace(/export\s+const\s+/g, "const ");
  const wrapped = `${moduleSource}
export { FIXED_EXERCISE_IMAGE_FILES, FIXED_EXERCISE_IMAGE_URLS, FIXED_EXERCISE_TEMPLATES_HU };`;
  const tmpDir = path.join(os.tmpdir(), "fitnesslady-seed");
  await fs.promises.mkdir(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `fixed-exercises-${Date.now()}.mjs`);
  await fs.promises.writeFile(tmpFile, wrapped, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

function firebaseToolsConfigPath() {
  const home = os.homedir();
  return path.join(home, ".config", "configstore", "firebase-tools.json");
}

async function getAccessToken() {
  const config = JSON.parse(await fs.promises.readFile(firebaseToolsConfigPath(), "utf8"));
  const tokens = config.tokens || {};

  if (tokens.access_token && tokens.expires_at && Number(tokens.expires_at) > Date.now() + 60_000) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    throw new Error("Nincs Firebase CLI refresh token. Futtasd: firebase login");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: FIREBASE_CLIENT_ID,
      client_secret: FIREBASE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token"
    })
  });

  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error(`Nem sikerült access tokent kérni: ${json.error || response.status}`);
  }

  return json.access_token;
}

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nestedValue]) => [key, firestoreValue(nestedValue)])
        )
      }
    };
  }
  return { stringValue: String(value) };
}

function firestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, firestoreValue(value)])
  );
}

function docName(id) {
  return `projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${id}`;
}

async function firestoreRequest(accessToken, endpoint, body) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(json, null, 2));
  }
  return json;
}

async function listExistingIds(accessToken, ids) {
  const endpoint = `projects/${PROJECT_ID}/databases/(default)/documents:batchGet`;
  const json = await firestoreRequest(accessToken, endpoint, {
    documents: ids.map(docName)
  });

  const existing = new Set();
  for (const row of json) {
    if (row.found?.name) {
      existing.add(row.found.name.split("/").pop());
    }
  }
  return existing;
}

async function commitWrites(accessToken, templates, existingIds) {
  const writes = templates.map((item) => {
    const seedPayload = {
      ...item,
      seedVersion: 2
    };
    const fields = firestoreFields(seedPayload);
    const fieldPaths = Object.keys(seedPayload);
    const transforms = [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }];

    if (!existingIds.has(item.id)) {
      transforms.push({ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" });
    }

    return {
      update: {
        name: docName(item.id),
        fields
      },
      updateMask: { fieldPaths },
      updateTransforms: transforms
    };
  });

  const endpoint = `projects/${PROJECT_ID}/databases/(default)/documents:commit`;
  return firestoreRequest(accessToken, endpoint, { writes });
}

async function main() {
  const { FIXED_EXERCISE_TEMPLATES_HU } = await importExerciseData();
  const ids = FIXED_EXERCISE_TEMPLATES_HU.map((item) => item.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) {
    throw new Error(`Duplikált fix edzés ID: ${duplicateIds.join(", ")}`);
  }

  const accessToken = await getAccessToken();
  const existingIds = await listExistingIds(accessToken, ids);
  await commitWrites(accessToken, FIXED_EXERCISE_TEMPLATES_HU, existingIds);

  const newIds = ids.filter((id) => !existingIds.has(id));
  console.log(JSON.stringify({
    ok: true,
    projectId: PROJECT_ID,
    collection: COLLECTION,
    totalTemplates: ids.length,
    created: newIds.length,
    updated: ids.length - newIds.length,
    createdIds: newIds
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
