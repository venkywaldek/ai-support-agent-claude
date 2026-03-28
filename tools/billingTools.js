export function calculateLaborCost(hoursWorked, hourlyRate) {
  const hours = Number(hoursWorked || 0);
  const rate = Number(hourlyRate || 0);
  return Number((hours * rate).toFixed(2));
}

export function calculateMaterialsSubtotal(materials = []) {
  const subtotal = materials.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    return sum + quantity * unitPrice;
  }, 0);

  return Number(subtotal.toFixed(2));
}

export function applyMaterialMarkup(materialsSubtotal, markupPercentage = 0) {
  const subtotal = Number(materialsSubtotal || 0);
  const markup = Number(markupPercentage || 0);

  const total = subtotal * (1 + markup / 100);
  return Number(total.toFixed(2));
}

export function calculateTravelCost(travelCost = 0) {
  return Number(Number(travelCost || 0).toFixed(2));
}

export function calculateTotalCost({
  labor_cost = 0,
  materials_cost = 0,
  travel_cost = 0,
}) {
  return Number((labor_cost + materials_cost + travel_cost).toFixed(2));
}

export function checkApprovalRequired(totalCost, approvalLimit) {
  if (approvalLimit == null) return false;
  return Number(totalCost) > Number(approvalLimit);
}

export function buildInvoiceItem({
  customer_id,
  contract_id,
  site_id,
  worker_id,
  date,
  service_category,
  work_type,
  description,
  hours_worked,
  rate_type,
  hourly_rate,
  materials = [],
  material_markup_percentage = 0,
  travel_cost = 0,
  requires_approval = false,
  certification_verified = null,
  validation_notes = [],
}) {
  const labor_cost = calculateLaborCost(hours_worked, hourly_rate);
  const materials_subtotal = calculateMaterialsSubtotal(materials);
  const materials_cost = applyMaterialMarkup(
    materials_subtotal,
    material_markup_percentage
  );
  const finalTravelCost = calculateTravelCost(travel_cost);
  const total_cost = calculateTotalCost({
    labor_cost,
    materials_cost,
    travel_cost: finalTravelCost,
  });

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
    rate_type,
    hourly_rate,
    labor_cost,
    materials,
    materials_cost,
    material_markup_percentage,
    travel_cost: finalTravelCost,
    total_cost,
    requires_approval,
    certification_verified,
    validation_notes,
  };
}