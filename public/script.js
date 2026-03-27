const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const chatBox = document.getElementById("chatBox");
const sendButton = document.getElementById("sendButton");

function addMessage(text, sender, metaText = "") {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${sender}`;

  const content = document.createElement("div");
  content.textContent = text;
  wrapper.appendChild(content);

  if (metaText) {
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = metaText;
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = input.value.trim();
  if (!message) return;

  addMessage(message, "user");
  input.value = "";
  sendButton.disabled = true;
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
      sendButton.disabled = false;
      return;
    }

    const meta = [data.type, data.priority].filter(Boolean).join(" • ");
    addMessage(data.reply, "bot", meta);
  } catch (error) {
    removeTyping();
    addMessage("Something went wrong connecting to the server.", "bot");
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});