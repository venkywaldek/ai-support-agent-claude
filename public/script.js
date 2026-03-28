const form = document.getElementById("chatForm");
const workerSelect = document.getElementById("workerSelect");
const input = document.getElementById("messageInput");
const chatBox = document.getElementById("chatBox");
const sendButton = document.getElementById("sendButton");
const voiceButton = document.getElementById("voiceButton");

const handledCount = document.getElementById("handledCount");
const followupCount = document.getElementById("followupCount");
const worklogCount = document.getElementById("worklogCount");

let handled = 0;
let followups = 0;
let worklogs = 0;

function addMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${sender}`;

  const content = document.createElement("div");
  content.textContent = text;

  wrapper.appendChild(content);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addTyping() {
  const div = document.createElement("div");
  div.className = "typing";
  div.id = "typingIndicator";
  div.textContent = "AI is thinking...";
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById("typingIndicator");
  if (typing) typing.remove();
}

function updateStats(data) {
  handled += 1;
  handledCount.textContent = handled;

  if (data.needs_follow_up) {
    followups += 1;
    followupCount.textContent = followups;
  }

  if (data.work_log) {
    worklogs += 1;
    worklogCount.textContent = worklogs;
  }
}

function getStatusClass(status = "") {
  const normalized = status.toLowerCase();
  if (normalized === "complete") return "status-complete";
  if (normalized === "pending_approval") return "status-pending";
  if (normalized === "prevented") return "status-prevented";
  if (normalized === "pending_review") return "status-review";
  return "status-default";
}

function formatCurrency(value) {
  const num = Number(value || 0);
  return `€${num.toFixed(2)}`;
}

function renderMaterials(materials = []) {
  if (!materials.length) {
    return `<div class="card-muted">No materials listed</div>`;
  }

  return `
    <div class="materials-list">
      ${materials
        .map(
          (item) => `
          <div class="material-row">
            <span>${item.name}</span>
            <span>${item.quantity} × ${formatCurrency(item.unit_price)} = ${formatCurrency(item.total_price)}</span>
          </div>
        `
        )
        .join("")}
    </div>
  `;
}

function addWorkLogCard(workLog) {
  const wrapper = document.createElement("div");
  wrapper.className = "result-card";

  const invoice = workLog.invoice_item;

  wrapper.innerHTML = `
    <div class="result-header">
      <div>
        <div class="result-title">Work Log Created</div>
        <div class="result-subtitle">${workLog.customer_id} • ${workLog.site_id} • ${workLog.service_category}</div>
      </div>
      <span class="result-status ${getStatusClass(workLog.status)}">
        ${workLog.status.replaceAll("_", " ")}
      </span>
    </div>

    <div class="result-section">
      <div class="result-label">Description</div>
      <div class="result-text">${workLog.description || "-"}</div>
    </div>

    <div class="result-grid">
      <div class="result-mini">
        <span class="result-label">Worker</span>
        <strong>${workLog.worker_id}</strong>
      </div>
      <div class="result-mini">
        <span class="result-label">Date</span>
        <strong>${workLog.date}</strong>
      </div>
      <div class="result-mini">
        <span class="result-label">Hours</span>
        <strong>${workLog.hours_worked ?? 0}</strong>
      </div>
      <div class="result-mini">
        <span class="result-label">Billable</span>
        <strong>${workLog.billable ? "Yes" : "No"}</strong>
      </div>
    </div>

    <div class="result-section">
      <div class="result-label">Materials</div>
      ${renderMaterials(workLog.materials || [])}
    </div>

    <div class="result-section">
      <div class="result-label">Billing reasoning</div>
      <div class="result-text">${workLog.billability_reasoning || "-"}</div>
    </div>

    ${
      workLog.compliance_flags && workLog.compliance_flags.length
        ? `
      <div class="result-section">
        <div class="result-label">Compliance flags</div>
        <div class="flags-list">
          ${workLog.compliance_flags
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

    ${
      invoice
        ? `
      <div class="billing-box">
        <div class="billing-title">Invoice Summary</div>
        <div class="billing-row"><span>Rate type</span><strong>${invoice.rate_type}</strong></div>
        <div class="billing-row"><span>Hourly rate</span><strong>${formatCurrency(invoice.hourly_rate)}</strong></div>
        <div class="billing-row"><span>Labor</span><strong>${formatCurrency(invoice.labor_cost)}</strong></div>
        <div class="billing-row"><span>Materials</span><strong>${formatCurrency(invoice.materials_cost)}</strong></div>
        <div class="billing-row"><span>Travel</span><strong>${formatCurrency(invoice.travel_cost)}</strong></div>
        <div class="billing-row billing-total"><span>Total</span><strong>${formatCurrency(invoice.total_cost)}</strong></div>
      </div>
    `
        : `
      <div class="billing-box billing-muted">
        <div class="billing-title">No invoice item</div>
        <div class="card-muted">This work was not invoiced.</div>
      </div>
    `
    }
  `;

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.querySelectorAll(".ticket-item").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.message || "";
    input.focus();
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const worker_id = workerSelect.value;
  const message = input.value.trim();

  if (!worker_id || !message) return;

  addMessage(message, "user");
  input.value = "";
  sendButton.disabled = true;
  addTyping();

  try {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        worker_id,
        message,
      }),
    });

    const data = await res.json();
    removeTyping();

    if (data.error) {
      addMessage(`Error: ${data.error}`, "bot");
      return;
    }

    addMessage(data.agent_reply || "No reply returned.", "bot");
    updateStats(data);

    if (data.work_log) {
      addWorkLogCard(data.work_log);
    }
  } catch (error) {
    removeTyping();
    addMessage("Something went wrong connecting to the server.", "bot");
    console.error(error);
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition && voiceButton) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceButton.addEventListener("click", () => {
    recognition.start();
    voiceButton.disabled = true;
    voiceButton.textContent = "Listening...";
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    voiceButton.textContent = "🎤";
    voiceButton.disabled = false;
    input.focus();
  };

  recognition.onerror = () => {
    voiceButton.textContent = "🎤";
    voiceButton.disabled = false;
    addMessage("Voice input failed. Please try again.", "bot");
  };

  recognition.onend = () => {
    voiceButton.textContent = "🎤";
    voiceButton.disabled = false;
  };
}