const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const chatBox = document.getElementById("chatBox");
const sendButton = document.getElementById("sendButton");
const escalateButton = document.getElementById("escalateButton");

const handledCount = document.getElementById("handledCount");
const aiCount = document.getElementById("aiCount");
const toolCount = document.getElementById("toolCount");

let handled = 0;
let aiReplies = 0;
let toolReplies = 0;

function getBadgeClass(type, value) {
  if (type === "type") return `type-${value}`;
  if (type === "priority") return `priority-${value}`;
  return "";
}

function addMessage(text, sender, type = "", priority = "") {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${sender}`;

  const content = document.createElement("div");
  content.textContent = text;
  wrapper.appendChild(content);

  if (type || priority) {
    const meta = document.createElement("div");
    meta.className = "meta";

    if (type) {
      const typeBadge = document.createElement("span");
      typeBadge.className = `badge ${getBadgeClass("type", type)}`;
      typeBadge.textContent = type;
      meta.appendChild(typeBadge);
    }

    if (priority) {
      const priorityBadge = document.createElement("span");
      priorityBadge.className = `badge ${getBadgeClass("priority", priority)}`;
      priorityBadge.textContent = priority;
      meta.appendChild(priorityBadge);
    }

    wrapper.appendChild(meta);
  }

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

function updateStats(type) {
  handled += 1;
  handledCount.textContent = handled;

  if (type === "ai-reply" || type === "general") {
    aiReplies += 1;
    aiCount.textContent = aiReplies;
  } else {
    toolReplies += 1;
    toolCount.textContent = toolReplies;
  }
}

async function sendToAgent(message, showUserMessage = true) {
  if (!message) return;

  if (showUserMessage) {
    addMessage(message, "user");
  }

  sendButton.disabled = true;
  if (escalateButton) {
    escalateButton.disabled = true;
  }

  addTyping();

  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    removeTyping();

    if (data.error) {
      addMessage(`Error: ${data.error}`, "bot");
      return;
    }

    addMessage(data.reply, "bot", data.type, data.priority);
    updateStats(data.type);
  } catch (error) {
    removeTyping();
    addMessage("Something went wrong connecting to the server.", "bot");
  } finally {
    sendButton.disabled = false;
    if (escalateButton) {
      escalateButton.disabled = false;
    }
    input.focus();
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  await sendToAgent(message, true);
});

if (escalateButton) {
  escalateButton.addEventListener("click", async () => {
    const message = "I want to talk to a real person";
    await sendToAgent(message, true);
  });
}