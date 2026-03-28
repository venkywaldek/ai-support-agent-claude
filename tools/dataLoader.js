import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");

function readJson(filename) {
  const fullPath = path.join(dataDir, filename);
  const raw = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(raw);
}

export function loadData() {
  return {
    contracts: readJson("contracts.json"),
    workers: readJson("workers.json"),
    workHistory: readJson("work_history.json"),
    partsCatalog: readJson("parts_catalog.json"),
  };
}