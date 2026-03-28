import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

import { loadData } from "../tools/dataLoader.js";
import {
  getWorkerById,
  hasCertification,
  isAssignedToCustomer,
} from "../tools/workerTools.js";
import {
  findSiteAndCustomerFromMessage,
  detectServiceCategory,
  getRateInfo,
  getMaterialMarkup,
  getIncidentApprovalLimit,
  getTravelCost,
  getCertificationRequirement,
  isServiceCovered,
} from "../tools/contractTools.js";
import { findPotentialDuplicateWork } from "../tools/historyTools.js";
import {
  findMissingFields,
  buildFollowUpQuestions,
  buildWorkLog, isWorkLoggingIntent,
  
} from "../tools/reportTools.js";
import {
  buildInvoiceItem,
  checkApprovalRequired,
} from "../tools/billingTools.js";
import {
  matchMaterialsFromMessage,
  suggestLikelyMaterials,
  mergeMaterials,
} from "../tools/materialTools.js";

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function handleAgentRequest(req, res) {
  try {
    const {
      message,
      worker_id = "W-001",
      date = new Date().toISOString().split("T")[0],
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const lowerMessage = message.toLowerCase().trim();

const smallTalkMessages = [
  "hi",
  "hello",
  "hey",
  "can i log my work",
  "i want to log my work",
  "need to log work",
  "log my work",
  "report work",
];

if (
  smallTalkMessages.includes(lowerMessage) ||
  lowerMessage.length < 12
) {
  return res.json({
    agent_reply:
      "Yes — send me a short work note with the site, what you did, how long it took, and any materials used.\n\nExample:\nFixed leaking pipe at Herttoniemi Warehouse, 1.5 hours, used 1m copper pipe and 2 couplings.",
    needs_follow_up: false,
    missing_fields: [],
    work_log: null,
  });
}
if (isWorkLoggingIntent(message)) {
  return res.json({
    agent_reply:
      "Yes — send me a short work note with the site, what you did, how long it took, and any materials used.\n\nExample:\nReplaced 3 LED tube lights at Greenfield Sports Hall, 1 hour, used 3 LED tubes.",
    needs_follow_up: false,
    missing_fields: [],
    work_log: null,
  });
}

    const { customers, workers, workHistory, partsCatalog } = loadData();

    const worker = getWorkerById(worker_id, workers);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const siteMatch = findSiteAndCustomerFromMessage(message, customers);

    const customer = siteMatch?.customer || null;
    const contract = siteMatch?.contract || null;
    const site = siteMatch?.site || null;

    const extraction = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `
Extract structured work info from this technician message.

Message:
${message}

Return JSON only in this shape:
{
  "description": "string",
  "hours_worked": number | null,
  "materials": [],
  "work_type": "repair"
}
`,
        },
      ],
    });

    let parsed;
    try {
      parsed = JSON.parse(extraction.content[0].text);
    } catch {
      parsed = {
        description: message,
        hours_worked: null,
        materials: [],
        work_type: "repair",
      };
    }

    const serviceCategory = detectServiceCategory(message, contract);

    const matchedMaterials = matchMaterialsFromMessage(message, partsCatalog);
    parsed.materials = mergeMaterials(parsed.materials || [], matchedMaterials);

    const missingFields = findMissingFields(
      {
        ...parsed,
        customer_id: customer?.customer_id,
        site_id: site?.site_id,
        service_category: serviceCategory,
      },
      { materialsLikelyRequired: true }
    );

    if (missingFields.length > 0) {
      const questions = buildFollowUpQuestions(missingFields);

      let materialSuggestions = [];
      if (missingFields.includes("materials")) {
        materialSuggestions = suggestLikelyMaterials({
          message,
          serviceCategory,
          workType: parsed.work_type || "repair",
          partsCatalog,
          workHistory,
          limit: 3,
        });
      }

      const extraPrompt =
        materialSuggestions.length > 0
          ? `\n\nYou might have used:\n- ${materialSuggestions
              .map((item) => item.name)
              .join("\n- ")}`
          : "";

      return res.json({
        agent_reply: `Got it, ${worker.name}. I need a bit more info:\n- ${questions.join(
          "\n- "
        )}${extraPrompt}`,
        needs_follow_up: true,
        missing_fields: missingFields,
        material_suggestions: materialSuggestions,
        work_log: null,
      });
    }

    if (!customer || !contract || !site) {
      return res.json({
        agent_reply:
          "I couldn't confidently match the customer site from that message. Which site was this at?",
        needs_follow_up: true,
        missing_fields: ["customer", "site"],
        work_log: null,
      });
    }

    if (!isAssignedToCustomer(worker, customer.customer_id)) {
      const workLog = buildWorkLog({
        customer_id: customer.customer_id,
        contract_id: contract.contract_id,
        site_id: site.site_id,
        worker_id,
        date,
        service_category: serviceCategory,
        work_type: parsed.work_type || "repair",
        description: parsed.description,
        hours_worked: parsed.hours_worked || 0,
        materials: parsed.materials || [],
        compliance_flags: [
          {
            type: "scope",
            severity: "warning",
            description: `${worker.name} is not assigned to customer ${customer.name}.`,
            action_required: "Confirm assignment or reroute the job.",
          },
        ],
        validation: {
          billable: false,
          prevented: true,
          pendingApproval: false,
          pendingReview: false,
          reason: "Worker is not assigned to this customer.",
        },
        invoice_item: null,
      });

      return res.json({
        agent_reply: `Hold on — you're not assigned to ${customer.name}. Please confirm with dispatch before logging this.`,
        needs_follow_up: false,
        missing_fields: [],
        work_log: workLog,
      });
    }

    const duplicate = findPotentialDuplicateWork(
      message,
      site.site_id,
      workHistory
    );

    if (duplicate) {
      const workLog = buildWorkLog({
        customer_id: customer.customer_id,
        contract_id: contract.contract_id,
        site_id: site.site_id,
        worker_id,
        date,
        service_category: serviceCategory,
        work_type: parsed.work_type || "repair",
        description: parsed.description,
        hours_worked: 0,
        materials: parsed.materials || [],
        compliance_flags: [
          {
            type: "duplicate",
            severity: "warning",
            description:
              "Similar work appears to have already been completed recently at this site.",
            action_required:
              "Review recent work history before doing this work again.",
          },
        ],
        validation: {
          billable: false,
          prevented: true,
          pendingApproval: false,
          pendingReview: false,
          reason:
            "Similar work appears to have already been completed recently.",
        },
        invoice_item: null,
      });

      return res.json({
        agent_reply:
          "Hold on — I found similar recent work at this site. Please review before doing this again.",
        needs_follow_up: false,
        missing_fields: [],
        work_log: workLog,
      });
    }

    const covered = isServiceCovered(
      contract,
      serviceCategory,
      parsed.description || message
    );

    const certificationRequirement = getCertificationRequirement(
      contract,
      serviceCategory
    );

    const certificationVerified = certificationRequirement
      ? hasCertification(worker, certificationRequirement)
      : null;

    if (certificationRequirement && !certificationVerified) {
      const workLog = buildWorkLog({
        customer_id: customer.customer_id,
        contract_id: contract.contract_id,
        site_id: site.site_id,
        worker_id,
        date,
        service_category: serviceCategory,
        work_type: parsed.work_type || "repair",
        description: parsed.description,
        hours_worked: 0,
        materials: parsed.materials || [],
        compliance_flags: [
          {
            type: "certification",
            severity: "critical",
            description: `This work requires ${certificationRequirement}, which ${worker.name} does not hold.`,
            action_required: "Assign a certified technician before work begins.",
          },
        ],
        validation: {
          billable: false,
          prevented: true,
          pendingApproval: false,
          pendingReview: false,
          reason: "Required certification is missing.",
        },
        invoice_item: null,
      });

      return res.json({
        agent_reply: `Stop before starting — this work requires ${certificationRequirement}. You are not certified for it.`,
        needs_follow_up: false,
        missing_fields: [],
        work_log: workLog,
      });
    }

    const rateInfo = getRateInfo(
      contract,
      parsed.work_type || "repair",
      date,
      message
    );

    const materialMarkup = getMaterialMarkup(contract);
    const approvalLimit = getIncidentApprovalLimit(contract);
    const travelCost = getTravelCost(contract);

    const validationNotes = [];
    const complianceFlags = [];

    const invoiceItem = buildInvoiceItem({
      customer_id: customer.customer_id,
      contract_id: contract.contract_id,
      site_id: site.site_id,
      worker_id,
      date,
      service_category: serviceCategory,
      work_type: parsed.work_type || "repair",
      description: parsed.description,
      hours_worked: parsed.hours_worked,
      rate_type: rateInfo.rate_type,
      hourly_rate: rateInfo.hourly_rate,
      materials: parsed.materials || [],
      material_markup_percentage: materialMarkup,
      travel_cost: travelCost,
      requires_approval: false,
      certification_verified: certificationVerified,
      validation_notes: validationNotes,
    });

    const requiresApproval = checkApprovalRequired(
      invoiceItem.total_cost,
      approvalLimit
    );

    if (!covered) {
      complianceFlags.push({
        type: "scope",
        severity: "warning",
        description:
          "This work does not appear to be covered by the contract scope.",
        action_required: "Review contract scope before billing.",
      });
    }

    if (requiresApproval) {
      complianceFlags.push({
        type: "cost_limit",
        severity: "warning",
        description: `Total cost exceeds approval threshold of ${approvalLimit} EUR.`,
        action_required: "Get approval before billing.",
      });
      validationNotes.push(
        `Total cost exceeds approval threshold of ${approvalLimit} EUR.`
      );
    }

    const billable = covered;
    const pendingApproval = requiresApproval && billable;

    const workLog = buildWorkLog({
      customer_id: customer.customer_id,
      contract_id: contract.contract_id,
      site_id: site.site_id,
      worker_id,
      date,
      service_category: serviceCategory,
      work_type: parsed.work_type || "repair",
      description: parsed.description,
      hours_worked: parsed.hours_worked,
      materials: parsed.materials || [],
      compliance_flags: complianceFlags,
      validation: {
        billable,
        prevented: false,
        pendingApproval,
        pendingReview: false,
        reason: billable
          ? pendingApproval
            ? "Work is within contract scope but needs approval before billing."
            : "Work is billable under the contract."
          : "Work is not covered by the contract.",
      },
      invoice_item: billable
        ? {
            ...invoiceItem,
            requires_approval: pendingApproval,
            approval_reason: pendingApproval
              ? `Total cost exceeds ${approvalLimit} EUR approval threshold.`
              : undefined,
            validation_notes: validationNotes,
          }
        : null,
    });

    return res.json({
      agent_reply: pendingApproval
        ? `Got it, ${worker.name}. I logged the work, but it needs approval before billing.`
        : `Got it, ${worker.name}. I logged the work${
            billable
              ? " and it looks billable under the contract."
              : ", but it does not appear billable under the contract."
          }`,
      needs_follow_up: false,
      missing_fields: [],
      work_log: workLog,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message || "Something went wrong",
    });
  }
}