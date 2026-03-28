export function findMissingFields(parsedInput, context = {}) {
  const missing = [];

  if (!parsedInput.customer_id) missing.push("customer");
  if (!parsedInput.site_id) missing.push("site");
  if (!parsedInput.service_category) missing.push("service_category");
  if (!parsedInput.description) missing.push("description");
  if (!parsedInput.hours_worked && parsedInput.hours_worked !== 0) missing.push("hours_worked");

  // Materials can be empty, but if work type likely needs materials, ask
  if (
    context.materialsLikelyRequired &&
    (!parsedInput.materials || parsedInput.materials.length === 0)
  ) {
    missing.push("materials");
  }

  return missing;
}

export function buildFollowUpQuestions(missingFields, parsedInput = {}) {
  const questions = [];

  if (missingFields.includes("customer") || missingFields.includes("site")) {
    questions.push("Which customer site was this at?");
  }

  if (missingFields.includes("service_category")) {
    questions.push("What kind of work was this: plumbing, HVAC, electrical, or something else?");
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