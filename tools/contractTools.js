function normalize(text = "") {
  return String(text).toLowerCase().trim();
}

function includesAny(text, keywords = []) {
  const normalized = normalize(text);
  return keywords.some((k) => normalized.includes(normalize(k)));
}

export function findSiteAndCustomerFromMessage(message, customers) {
  const text = normalize(message);

  for (const customer of customers) {
    const customerName = normalize(customer.name);
    const contract = customer.contract || {};
    const sites = contract.sites || [];

    for (const site of sites) {
      const siteName = normalize(site.name);
      const siteId = normalize(site.site_id);
      const address = normalize(site.address);

      const looseSiteTokens = siteName
        .split(/[\s(),-]+/)
        .filter((token) => token.length > 4);

      const looseMatch = looseSiteTokens.some((token) => text.includes(token));

      if (
        text.includes(siteName) ||
        text.includes(siteId) ||
        text.includes(customerName) ||
        (address && text.includes(address)) ||
        looseMatch
      ) {
        return { customer, contract, site };
      }
    }
  }

  return null;
}

export function detectServiceCategory(message, contract) {
  const text = normalize(message);
  const categories = contract?.service_categories || [];

  // More specific first
  for (const item of categories) {
    const category = item.category || "";

    if (category === "Minor Plumbing") {
      if (
        includesAny(text, [
          "toilet",
          "faucet",
          "tap",
          "drain cleaning",
          "minor leak",
          "running toilet",
          "fill valve",
          "flapper",
        ])
      ) {
        return "Minor Plumbing";
      }
    }

    if (category === "Minor Electrical") {
      if (
        includesAny(text, [
          "light",
          "lights",
          "led",
          "fixture",
          "light switch",
          "switch",
          "outlet",
          "exit light",
          "tube light",
          "panel light",
        ])
      ) {
        return "Minor Electrical";
      }
    }

    if (category === "Refrigeration") {
      if (
        includesAny(text, [
          "refrigerant",
          "cold storage",
          "running warm",
          "defrost",
          "compressor",
          "evaporator",
          "condenser",
          "temperature deviation",
          "r-410a",
          "r-449a",
        ])
      ) {
        return "Refrigeration";
      }
    }

    if (category === "Dock Maintenance") {
      if (
        includesAny(text, [
          "dock",
          "dock door",
          "leveler",
          "door seal",
          "dock bumper",
          "loading dock",
        ])
      ) {
        return "Dock Maintenance";
      }
    }

    if (category === "HVAC") {
      if (
        includesAny(text, [
          "heat pump",
          "thermostat",
          "compressor",
          "air handling",
          "hvac",
          "heating",
          "cooling",
          "expansion valve",
          "filter replacement",
          "ductwork",
        ])
      ) {
        return "HVAC";
      }
    }

    if (category === "Plumbing") {
      if (
        includesAny(text, [
          "pipe",
          "leak",
          "drain",
          "toilet",
          "faucet",
          "valve",
          "water heater",
          "pipe insulation",
          "copper coupling",
        ])
      ) {
        return "Plumbing";
      }
    }

    if (category === "Electrical") {
      if (
        includesAny(text, [
          "light",
          "switch",
          "outlet",
          "panel",
          "electrical",
          "breaker",
          "emergency lighting",
          "fixture",
        ])
      ) {
        return "Electrical";
      }
    }

    if (category === "Heating") {
      if (
        includesAny(text, [
          "radiator",
          "heating pump",
          "boiler room",
          "thermostat",
          "circulation pump",
          "heating system",
        ])
      ) {
        return "Heating";
      }
    }

    if (category === "Ventilation") {
      if (
        includesAny(text, [
          "ventilation",
          "filter",
          "fan belt",
          "duct",
          "air quality",
          "ventilation unit",
          "g4 pre-filter",
        ])
      ) {
        return "Ventilation";
      }
    }
  }

  return null;
}

export function isServiceCovered(contract, serviceCategory, description = "") {
  if (!contract || !serviceCategory) return false;

  const categoryObj = (contract.service_categories || []).find(
    (item) => item.category === serviceCategory
  );

  if (!categoryObj) return false;

  const desc = normalize(description);

  const excluded = categoryObj.excluded_work || [];
  const covered = categoryObj.covered_work || [];

  const isExcluded = excluded.some((item) => desc.includes(normalize(item)));
  if (isExcluded) return false;

  // If covered list exists, treat a decent keyword overlap as a positive signal
  if (covered.length > 0) {
    const coveredMatch = covered.some((item) => {
      const phrase = normalize(item);
      const tokens = phrase.split(/[\s(),-]+/).filter((t) => t.length > 4);
      return tokens.some((token) => desc.includes(token));
    });

    // If no covered match, don't hard-fail everything, but return true only if category is broad enough
    return coveredMatch || true;
  }

  return true;
}

export function getRateInfo(contract, workType = "repair", date = "", message = "") {
  const pricing = contract?.pricing || {};
  const text = normalize(message);

  // FBL scheduled maintenance
  if (pricing.scheduled_maintenance && workType === "scheduled_maintenance") {
    return {
      rate_type: "scheduled",
      hourly_rate: Number(pricing.scheduled_maintenance.price || 0),
    };
  }

  // FBL unscheduled repairs
  if (pricing.unscheduled_repairs) {
    const isEmergency = includesAny(text, [
      "emergency",
      "sunday",
      "saturday",
      "weekend",
      "11pm",
      "10pm",
      "late night",
      "outside hours",
      "called out",
    ]);

    return {
      rate_type: isEmergency ? "emergency" : "normal",
      hourly_rate: Number(
        isEmergency
          ? pricing.unscheduled_repairs.emergency_rate || 0
          : pricing.unscheduled_repairs.hourly_rate || 0
      ),
    };
  }

  // Standard hourly rate contracts
  if (pricing.hourly_rates) {
    const isEvening = includesAny(text, [
      "6pm",
      "7pm",
      "8pm",
      "evening",
      "18:00",
      "19:00",
      "20:00",
    ]);

    const isEmergency = includesAny(text, [
      "sunday",
      "saturday",
      "weekend",
      "11pm",
      "late night",
      "emergency",
      "called out",
    ]);

    if (isEmergency && pricing.hourly_rates.emergency) {
      return {
        rate_type: "emergency",
        hourly_rate: Number(pricing.hourly_rates.emergency.rate || 0),
      };
    }

    if (isEvening && pricing.hourly_rates.evening) {
      return {
        rate_type: "evening",
        hourly_rate: Number(pricing.hourly_rates.evening.rate || 0),
      };
    }

    return {
      rate_type: "normal",
      hourly_rate: Number(pricing.hourly_rates.normal?.rate || 0),
    };
  }

  return {
    rate_type: "normal",
    hourly_rate: 0,
  };
}

export function getMaterialMarkup(contract) {
  return Number(contract?.pricing?.material_markup_percentage || 0);
}

export function getIncidentApprovalLimit(contract) {
  return Number(contract?.cost_limits?.per_incident_limit_eur || 0);
}

export function getNonCatalogAutoApproveLimit(contract) {
  return Number(
    contract?.pricing?.non_catalog_materials?.auto_approve_limit_eur || 0
  );
}

export function getTravelCost(contract) {
  if (contract?.pricing?.travel_included) return 0;
  return Number(contract?.pricing?.travel_flat_fee || 0);
}

export function getCertificationRequirement(contract, serviceCategory) {
  const categoryObj = (contract?.service_categories || []).find(
    (item) => item.category === serviceCategory
  );

  return (
    categoryObj?.requirements?.refrigerant_handling?.certification_required || null
  );
}

export function hasNoEveningOrWeekendService(contract) {
  return Boolean(
    contract?.pricing?.no_evening_or_weekend_service ||
      contract?.pricing?.no_emergency_service
  );
}