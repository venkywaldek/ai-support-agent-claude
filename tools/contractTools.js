export function findSiteAndCustomerFromMessage(message, contracts) {
  const text = message.toLowerCase();

  for (const customer of contracts) {
    if (Array.isArray(customer.sites)) {
      for (const site of customer.sites) {
        const siteName = site.name?.toLowerCase() || "";
        const siteId = site.site_id?.toLowerCase() || "";
        const customerName = customer.customer_name?.toLowerCase() || "";

        if (
          text.includes(siteName) ||
          text.includes(siteId) ||
          text.includes(customerName)
        ) {
          return {
            customer,
            site,
          };
        }
      }
    }
  }

  return null;
}

export function detectServiceCategory(message, contract) {
  const text = message.toLowerCase();

  const categories =
    contract?.service_categories ||
    contract?.covered_services ||
    [];

  for (const category of categories) {
    const name =
      typeof category === "string"
        ? category
        : category.name || category.service_category || "";

    const lower = name.toLowerCase();

    if (
      (lower.includes("plumb") && (text.includes("pipe") || text.includes("leak") || text.includes("drain"))) ||
      (lower.includes("elect") && (text.includes("light") || text.includes("socket") || text.includes("wiring"))) ||
      (lower.includes("hvac") && (text.includes("hvac") || text.includes("vent") || text.includes("air") || text.includes("cool"))) ||
      text.includes(lower)
    ) {
      return name;
    }
  }

  if (text.includes("pipe") || text.includes("leak")) return "Plumbing";
  if (text.includes("light") || text.includes("electrical")) return "Electrical";
  if (text.includes("hvac") || text.includes("cooling")) return "HVAC";

  return null;
}

export function getHourlyRate(contract, serviceCategory) {
  if (!contract) return 0;

  const pricing = contract.pricing || {};
  const categoryRates = pricing.hourly_rates || pricing.rates || [];

  if (Array.isArray(categoryRates)) {
    const match = categoryRates.find((item) => {
      const name = item.service_category || item.name || "";
      return name.toLowerCase() === String(serviceCategory || "").toLowerCase();
    });

    if (match) {
      return Number(match.normal_rate || match.hourly_rate || match.rate || 0);
    }
  }

  return Number(pricing.default_hourly_rate || 60);
}

export function getMaterialMarkup(contract) {
  return Number(
    contract?.pricing?.material_markup_percentage ??
      contract?.pricing?.material_markup ??
      10
  );
}

export function getApprovalLimit(contract) {
  return Number(
    contract?.pricing?.approval_limit ??
      contract?.pricing?.cost_limit ??
      500
  );
}

export function isServiceCovered(contract, serviceCategory) {
  if (!contract || !serviceCategory) return false;

  const categories =
    contract.service_categories ||
    contract.covered_services ||
    [];

  return categories.some((category) => {
    const name =
      typeof category === "string"
        ? category
        : category.name || category.service_category || "";

    return name.toLowerCase() === serviceCategory.toLowerCase();
  });
}