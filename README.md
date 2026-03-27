# AI Support Agent (Claude)

An AI-powered customer support agent built using Node.js and Claude API.

## 🚀 What it does
This system takes user input (e.g. customer questions) and:
- Generates intelligent responses using Claude AI
- Simulates support workflows
- Can be extended with tools (e.g. order status, CRM lookup)

## 🧠 How it works
Input → AI (Claude) → Response  
Optional: AI + backend logic → action → result

## 🛠 Tech Stack
- Node.js
- Express
- Claude API (Anthropic)
- Docker

## ▶️ Running the project

### With Docker
```bash
docker build -t ai-support-agent .
docker run --env-file .env -p 3000:3000 ai-support-agent