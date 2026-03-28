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

function getAssociations(part) {
  return safeArray(
    part.work_type_associations ||
      part.associations ||
      part.tags ||
      part.keywords
  ).map(normalizeText);
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
      if (match) {
        return Number(match[1]);
      }
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
    const totalPrice = Number((quantity * unitPrice).toFixed(2));

    matches.push({
      part_id: getPartId(part),
      name: getPartName(part),
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
    });
  }

  const unique = [];
  const seen = new Set();

  for (const item of matches) {
    const key = `${item.part_id}-${item.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
}

export function suggestLikelyMaterials({
  message = "",
  serviceCategory = "",
  workType = "",
  partsCatalog,
  workHistory = [],
  limit = 5,
}) {
  const text = normalizeText(message);
  const category = normalizeText(serviceCategory);
  const workTypeText = normalizeText(workType);
  const items = getCatalogItems(partsCatalog);

  const scored = items.map((part) => {
    let score = 0;

    const aliases = getAliases(part);
    const associations = getAssociations(part);

    if (category && associations.some((a) => a.includes(category))) score += 4;
    if (workTypeText && associations.some((a) => a.includes(workTypeText))) score += 4;

    if (text.includes("pipe") || text.includes("leak")) {
      if (
        aliases.some((a) =>
          ["pipe", "copper", "coupling", "seal", "flux", "solder", "valve"].some((k) =>
            a.includes(k)
          )
        )
      ) {
        score += 3;
      }
    }

    if (text.includes("light") || text.includes("switch") || text.includes("electrical")) {
      if (
        aliases.some((a) =>
          ["light", "led", "switch", "outlet", "fixture"].some((k) => a.includes(k))
        )
      ) {
        score += 3;
      }
    }

    if (text.includes("filter") || text.includes("ventilation")) {
      if (
        aliases.some((a) => ["filter", "belt", "fan"].some((k) => a.includes(k)))
      ) {
        score += 3;
      }
    }

    if (
      text.includes("refrigerant") ||
      text.includes("cold storage") ||
      text.includes("compressor") ||
      text.includes("defrost")
    ) {
      if (
        aliases.some((a) =>
          ["refrigerant", "valve", "flare", "filter", "heater"].some((k) =>
            a.includes(k)
          )
        )
      ) {
        score += 3;
      }
    }

    const historyBoost = safeArray(workHistory).some((entry) => {
      const desc = normalizeText(entry.description || "");
      return (
        desc &&
        (category ? desc.includes(category) : false) &&
        aliases.some((a) => a && desc.includes(a))
      );
    });

    if (historyBoost) score += 2;

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
      associations: getAssociations(part),
    }));
}

export function mergeMaterials(reportedMaterials = [], matchedMaterials = []) {
  const result = [];
  const seen = new Map();

  for (const item of [...reportedMaterials, ...matchedMaterials]) {
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