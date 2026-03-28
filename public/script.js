const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const chatBox = document.getElementById("chatBox");
const sendButton = document.getElementById("sendButton");

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

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = input.value.trim();
  if (!message) return;

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
        message,
        worker_id: "W-002",
        date: "2026-03-25",
      }),
    });

    const data = await res.json();
    removeTyping();

    if (data.error) {
      addMessage(`Error: ${data.error}`, "bot");
      return;
    }

    addMessage(data.agent_reply || "No reply returned.", "bot");

    if (data.work_log) {
      addMessage(
        `Work log created:\n${JSON.stringify(data.work_log, null, 2)}`,
        "bot"
      );
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