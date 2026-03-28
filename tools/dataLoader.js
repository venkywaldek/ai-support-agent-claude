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
  const contractsJson = readJson("contracts.json");
  const workersJson = readJson("workers.json");
  const workHistoryJson = readJson("work_history.json");
  const partsCatalogJson = readJson("parts_catalog.json");
  const workQueueJson = readJson("work_queue.json");
  const workLogSchemaJson = readJson("work_log_schema.json");
  const invoiceItemSchemaJson = readJson("invoice_item_schema.json");
  const testPromptsJson = readJson("test_prompts.json");
  const exampleConversationsJson = readJson("example_conversations.json");

  return {
    customers: contractsJson.customers || [],
    workers: workersJson.workers || [],
    workHistory: workHistoryJson.work_history || workHistoryJson.records || workHistoryJson.history || [],
    partsCatalog: partsCatalogJson.parts || partsCatalogJson.catalog || partsCatalogJson.items || [],
    workQueue: workQueueJson.jobs || workQueueJson.work_queue || workQueueJson.items || [],
    workLogSchema: workLogSchemaJson,
    invoiceItemSchema: invoiceItemSchemaJson,
    testPrompts: testPromptsJson.test_cases || [],
    exampleConversations: exampleConversationsJson.conversations || [],
  };
}