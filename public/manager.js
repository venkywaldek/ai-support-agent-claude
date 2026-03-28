const summaryCards = document.getElementById("summaryCards");
const workLogList = document.getElementById("workLogList");
const filterButtons = document.querySelectorAll(".filter-button");

let allLogs = [];
let currentFilter = "all";

function formatCurrency(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function getStatusClass(status = "") {
  if (status === "complete") return "status-complete";
  if (status === "pending_approval") return "status-pending";
  if (status === "pending_review") return "status-review";
  if (status === "prevented") return "status-prevented";
  return "status-default";
}

function renderSummary(summary) {
  summaryCards.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">Total Logs</span>
      <strong>${summary.total}</strong>
    </div>
    <div class="summary-card">
      <span class="summary-label">Pending Approval</span>
      <strong>${summary.pendingApproval}</strong>
    </div>
    <div class="summary-card">
      <span class="summary-label">Pending Review</span>
      <strong>${summary.pendingReview}</strong>
    </div>
    <div class="summary-card">
      <span class="summary-label">Prevented</span>
      <strong>${summary.prevented}</strong>
    </div>
    <div class="summary-card">
      <span class="summary-label">Billable</span>
      <strong>${summary.billable}</strong>
    </div>
  `;
}

function filterLogs(logs, filter) {
  if (filter === "all") return logs;
  if (filter === "flagged") {
    return logs.filter(
      (log) =>
        log.status === "pending_approval" ||
        log.status === "pending_review" ||
        log.status === "prevented" ||
        (Array.isArray(log.compliance_flags) && log.compliance_flags.length > 0)
    );
  }
  if (filter === "billable") {
    return logs.filter((log) => log.billable);
  }
  return logs.filter((log) => log.status === filter);
}

function renderLogs(logs) {
  if (!logs.length) {
    workLogList.innerHTML = `<div class="empty-state">No work logs found for this filter.</div>`;
    return;
  }

  workLogList.innerHTML = logs
    .map((log) => {
      const invoice = log.invoice_item;

      return `
        <div class="manager-card">
          <div class="manager-card-header">
            <div>
              <div class="manager-card-title">${log.service_category || "Unknown category"}</div>
              <div class="manager-card-subtitle">
                ${log.worker_id} • ${log.customer_id} • ${log.site_id} • ${log.date}
              </div>
            </div>
            <span class="result-status ${getStatusClass(log.status)}">
              ${String(log.status || "").replaceAll("_", " ")}
            </span>
          </div>

          <div class="manager-card-section">
            <div class="result-label">Description</div>
            <div class="result-text">${log.description || "-"}</div>
          </div>

          <div class="manager-card-grid">
            <div class="result-mini">
              <span class="result-label">Hours</span>
              <strong>${log.hours_worked ?? 0}</strong>
            </div>
            <div class="result-mini">
              <span class="result-label">Billable</span>
              <strong>${log.billable ? "Yes" : "No"}</strong>
            </div>
            <div class="result-mini">
              <span class="result-label">Total</span>
              <strong>${invoice ? formatCurrency(invoice.total_cost) : "-"}</strong>
            </div>
            <div class="result-mini">
              <span class="result-label">Approval</span>
              <strong>${invoice?.requires_approval ? "Required" : "No"}</strong>
            </div>
          </div>

          <div class="manager-card-section">
            <div class="result-label">Billing Reason</div>
            <div class="result-text">${log.billability_reasoning || "-"}</div>
          </div>

          ${
            Array.isArray(log.compliance_flags) && log.compliance_flags.length
              ? `
            <div class="manager-card-section">
              <div class="result-label">Flags</div>
              <div class="flags-list">
                ${log.compliance_flags
                  .map(
                    (flag) => `
                  <div class="flag-item">
                    <strong>${flag.type}</strong>: ${flag.description}
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }
        </div>
      `;
    })
    .join("");
}

async function loadSummary() {
  const res = await fetch("/api/admin/summary");
  const data = await res.json();
  renderSummary(data.summary);
}

async function loadWorkLogs() {
  const res = await fetch("/api/admin/worklogs");
  const data = await res.json();
  allLogs = data.work_logs || [];
  renderLogs(filterLogs(allLogs, currentFilter));
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.filter;
    renderLogs(filterLogs(allLogs, currentFilter));
  });
});

async function init() {
  await loadSummary();
  await loadWorkLogs();
}

init();