export function isWorkLoggingIntent(message = "") {
  const text = message.toLowerCase().trim();

  const genericPhrases = [
    "hi",
    "hello",
    "hey",
    "can i log my work",
    "i want to log my work",
    "log my work",
    "report work",
    "need to report work",
    "can i report my work",
  ];

  return genericPhrases.includes(text) || text.length < 8;
}

export function findMissingFields(parsedInput, context = {}) {
  const missing = [];

  if (!parsedInput.customer_id) missing.push("customer");
  if (!parsedInput.site_id) missing.push("site");
  if (!parsedInput.service_category) missing.push("service_category");
  if (!parsedInput.description) missing.push("description");

  if (
    parsedInput.hours_worked == null ||
    Number.isNaN(Number(parsedInput.hours_worked))
  ) {
    missing.push("hours_worked");
  }

  if (
    context.materialsLikelyRequired &&
    (!parsedInput.materials || parsedInput.materials.length === 0)
  ) {
    missing.push("materials");
  }

  return missing;
}

export function buildFollowUpQuestions(missingFields) {
  const questions = [];

  if (missingFields.includes("customer") || missingFields.includes("site")) {
    questions.push("Which customer site was this at?");
  }

  if (missingFields.includes("service_category")) {
    questions.push(
      "What kind of work was this: plumbing, HVAC, electrical, heating, ventilation, or refrigeration?"
    );
  }

  if (missingFields.includes("description")) {
    questions.push("What exactly did you do?");
  }

  if (missingFields.includes("hours_worked")) {
    questions.push("How long did the job take?");
  }

  if (missingFields.includes("materials")) {
    questions.push("What materials or parts did you use, if any?");
  }

  return questions;
}

export function determineWorkLogStatus(validation = {}) {
  if (validation.prevented) return "prevented";
  if (validation.pendingApproval) return "pending_approval";
  if (validation.pendingReview) return "pending_review";
  return "complete";
}

export function buildBillabilityReasoning(validation = {}) {
  if (validation.prevented) {
    return validation.reason || "Work was prevented before starting.";
  }

  if (validation.pendingReview) {
    return validation.reason || "Work requires management review before billing.";
  }

  if (validation.pendingApproval) {
    return validation.reason || "Work requires approval before billing.";
  }

  if (validation.billable === false) {
    return validation.reason || "Work is not billable under the contract.";
  }

  return validation.reason || "Work is billable under the contract.";
}

export function buildWorkLog({
  customer_id,
  contract_id,
  site_id,
  worker_id,
  date,
  service_category,
  work_type,
  description,
  hours_worked,
  materials = [],
  compliance_flags = [],
  validation = {},
  invoice_item = null,
}) {
  const status = determineWorkLogStatus(validation);
  const billable = validation.billable ?? false;
  const billability_reasoning = buildBillabilityReasoning(validation);

  return {
    customer_id,
    contract_id,
    site_id,
    worker_id,
    date,
    service_category,
    work_type,
    description,
    hours_worked,
    materials,
    status,
    billable,
    billability_reasoning,
    compliance_flags,
    invoice_item: billable ? invoice_item : null,
  };
}

export function extractHoursFromText(text = "") {
  const normalized = text.toLowerCase();

  const patterns = [
    /(\d+(?:\.\d+)?)\s*(hours|hour|hrs|hr|h)\b/,
    /about\s+(\d+(?:\.\d+)?)\s*(hours|hour|hrs|hr|h)\b/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

export function extractDescriptionFromText(text = "") {
  return text.trim();
}

export function mergeDraftWithFollowUp(draft = {}, followUp = {}) {
  return {
    ...draft,
    description: followUp.description || draft.description || "",
    hours_worked:
      followUp.hours_worked != null ? followUp.hours_worked : draft.hours_worked,
    work_type: followUp.work_type || draft.work_type || "repair",
    materials:
      followUp.materials && followUp.materials.length > 0
        ? followUp.materials
        : draft.materials || [],
  };
}