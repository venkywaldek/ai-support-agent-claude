import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import {
  getOrderStatus,
  getRefundPolicy,
  getWorkingHours,
  getCurrentDateTime,
  classifyTicket,
  getCompanyInfo,
  detectTool,
} from "../tools/supportTools.js";

dotenv.config();

export async function handleAgentRequest(req, res) {
  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const tool = detectTool(message);

    if (tool === "order") {
      return res.json({
        type: "order",
        priority: "normal",
        reply: getOrderStatus(),
      });
    }

    if (tool === "refund") {
      return res.json({
        type: "refund",
        priority: "medium",
        reply: getRefundPolicy(),
      });
    }

    if (tool === "hours") {
      return res.json({
        type: "hours",
        priority: "normal",
        reply: getWorkingHours(),
      });
    }

    if (tool === "datetime") {
      return res.json({
        type: "datetime",
        priority: "normal",
        reply: getCurrentDateTime(),
      });
    }

    if (tool === "classify") {
      return res.json({
        type: "classification",
        priority: "info",
        reply: `Ticket classification: ${classifyTicket(message)}`,
      });
    }

    if (tool === "companyInfo") {
      const info = getCompanyInfo(message);
      return res.json({
        type: "company-info",
        priority: "normal",
        reply: info || "I could not find that company information.",
      });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    if (tool === "aiReply") {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are a professional customer support agent.

Write a polite, clear customer support reply to this message:

${message}`,
          },
        ],
      });

      return res.json({
        type: "ai-reply",
        priority: "normal",
        reply: response.content[0].text,
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are a helpful AI customer support assistant.

User message:
${message}

Respond clearly, professionally, and briefly.`,
        },
      ],
    });

    return res.json({
      type: "general",
      priority: "normal",
      reply: response.content[0].text,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message || "Something went wrong",
    });
  }
}