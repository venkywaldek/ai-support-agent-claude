function normalizeText(text = "") {
  return String(text).toLowerCase().trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getCatalogItems(partsCatalog) {
  if (Array.isArray(partsCatalog)) return partsCatalog;
  if (Array.isArray(partsCatalog?.parts)) return partsCatalog.parts;
  if (Array.isArray(partsCatalog?.items)) return partsCatalog.items;
  if (Array.isArray(partsCatalog?.catalog)) return partsCatalog.catalog;
  return [];
}

function getPartName(part) {
  return part.name || part.part_name || "";
}

function getPartId(part) {
  return part.part_id || part.id || "UNKNOWN";
}

function getUnitPrice(part) {
  return Number(part.unit_price || part.price || 0);
}

function getAliases(part) {
  const aliases = safeArray(part.aliases).map(normalizeText);
  const name = normalizeText(getPartName(part));
  return [...new Set([name, ...aliases])];
}

function estimateQuantityFromMessage(message, aliases) {
  const text = normalizeText(message);

  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const patterns = [
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*x\\s*${escaped}`),
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${escaped}`),
      new RegExp(`${escaped}\\s*x\\s*(\\d+(?:\\.\\d+)?)`),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
  }

  return 1;
}

export function matchMaterialsFromMessage(message, partsCatalog) {
  const text = normalizeText(message);
  const items = getCatalogItems(partsCatalog);

  const matches = [];

  for (const part of items) {
    const aliases = getAliases(part);
    const found = aliases.some((alias) => alias && text.includes(alias));

    if (!found) continue;

    const quantity = estimateQuantityFromMessage(text, aliases);
    const unitPrice = getUnitPrice(part);

    matches.push({
      part_id: getPartId(part),
      name: getPartName(part),
      quantity,
      unit_price: unitPrice,
      total_price: Number((quantity * unitPrice).toFixed(2)),
    });
  }

  const seen = new Set();
  return matches.filter((item) => {
    const key = `${item.part_id}-${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildNonCatalogMaterial({
  name,
  quantity = 1,
  unit_price = 0,
}) {
  const qty = Number(quantity || 1);
  const price = Number(unit_price || 0);

  return {
    part_id: "NON-CATALOG",
    name: name || "Non-catalog material",
    source: "non-catalog",
    quantity: qty,
    unit_price: price,
    total_price: Number((qty * price).toFixed(2)),
  };
}

export function detectFreeTextMaterial(message = "") {
  const text = normalizeText(message);

  const ignore = [
    "hours",
    "hour",
    "hrs",
    "hr",
    "site",
    "today",
    "yesterday",
    "fixed",
    "repair",
    "worked",
    "done",
  ];

  if (text.length < 3) return null;
  if (ignore.some((w) => text === w)) return null;

  // If user says "I used X" or just sends a material name, accept it.
  const cleaned = text
    .replace(/^i used\s+/i, "")
    .replace(/^used\s+/i, "")
    .trim();

  if (!cleaned) return null;

  return buildNonCatalogMaterial({
    name: cleaned,
    quantity: 1,
    unit_price: 0,
  });
}

export function mergeMaterials(existing = [], incoming = []) {
  const result = [];
  const seen = new Map();

  for (const item of [...existing, ...incoming]) {
    const key = item.part_id || item.name;
    if (!seen.has(key)) {
      const normalized = {
        part_id: item.part_id || "UNKNOWN",
        name: item.name || "Unknown material",
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        total_price: Number(
          (
            Number(
              item.total_price ||
                Number(item.quantity || 1) * Number(item.unit_price || 0)
            )
          ).toFixed(2)
        ),
      };
      seen.set(key, normalized);
      result.push(normalized);
    }
  }

  return result;
}

export function suggestLikelyMaterials({
  message = "",
  serviceCategory = "",
  workType = "",
  partsCatalog,
  limit = 5,
}) {
  const text = normalizeText(message);
  const items = getCatalogItems(partsCatalog);

  const scored = items.map((part) => {
    let score = 0;
    const name = normalizeText(getPartName(part));
    const aliases = getAliases(part);

    // Plumbing
    if (
      text.includes("pipe") ||
      text.includes("leak") ||
      text.includes("coupling") ||
      text.includes("copper")
    ) {
      if (
        aliases.some((a) =>
          ["pipe", "copper", "coupling", "flux", "solder", "seal", "tape", "valve"].some((k) =>
            a.includes(k)
          )
        )
      ) {
        score += 10;
      }
    }

    // Electrical / lighting
    if (
      text.includes("light") ||
      text.includes("led") ||
      text.includes("switch") ||
      text.includes("outlet")
    ) {
      if (
        aliases.some((a) =>
          ["light", "led", "tube", "panel", "switch", "outlet", "fixture"].some((k) =>
            a.includes(k)
          )
        )
      ) {
        score += 10;
      }
    }

    // HVAC / refrigeration
    if (
      text.includes("refrigerant") ||
      text.includes("cold storage") ||
      text.includes("defrost") ||
      text.includes("compressor")
    ) {
      if (
        aliases.some((a) =>
          ["refrigerant", "valve", "flare", "heater", "filter"].some((k) =>
            a.includes(k)
          )
        )
      ) {
        score += 10;
      }
    }

    if (normalizeText(serviceCategory).includes("plumbing") && name.includes("copper")) {
      score += 3;
    }

    return { part, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ part }) => ({
      part_id: getPartId(part),
      name: getPartName(part),
      unit_price: getUnitPrice(part),
    }));
}