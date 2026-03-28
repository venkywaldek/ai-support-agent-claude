// import dotenv from "dotenv";
// import Anthropic from "@anthropic-ai/sdk";

// import {loadData} from "../tools/dataLoader.js";
// import { findMissingFields, buildFollowUpQuestions, buildWorkLog } from "../tools/reportTools.js";
// import { buildInvoiceItem } from "../tools/billingTools.js";


// dotenv.config();



// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });

// export async function handleAgentRequest(req, res) {
//   try {
//     const { message, worker_id = "W-001", date = new Date().toISOString().split("T")[0] } = req.body;

//     if (!message) {
//       return res.status(400).json({ error: "message is required" });
//     }

//     // 🧠 STEP 1: Extract structured info from Claude
//     const extraction = await anthropic.messages.create({
//       model: "claude-sonnet-4-6",
//       max_tokens: 300,
//       messages: [
//         {
//           role: "user",
//           content: `
// Extract structured work info from this technician message.

// Message:
// ${message}

// Return JSON:
// {
//   "description": "...",
//   "hours_worked": number,
//   "materials": [],
//   "work_type": "repair"
// }
// Only JSON.
// `,
//         },
//       ],
//     });

//     let parsed;
//     try {
//       parsed = JSON.parse(extraction.content[0].text);
//     } catch {
//       parsed = { description: message };
//     }

//     // 🧠 STEP 2: Check missing fields
//     const missingFields = findMissingFields(parsed, {
//       materialsLikelyRequired: true,
//     });

//     if (missingFields.length > 0) {
//       const questions = buildFollowUpQuestions(missingFields);

//       return res.json({
//         agent_reply: `I need a bit more info:\n- ${questions.join("\n- ")}`,
//         needs_follow_up: true,
//         missing_fields: missingFields,
//         work_log: null,
//       });
//     }

//     // 🧠 STEP 3: Simulated contract + worker (MVP)
//     const contract = {
//       customer_id: "CUST-001",
//       contract_id: "CON-001",
//       site_id: "SITE-001",
//       hourly_rate: 60,
//       material_markup: 10,
//       approval_limit: 500,
//     };

//     // 🧠 STEP 4: Build invoice
//     const invoiceItem = buildInvoiceItem({
//       customer_id: contract.customer_id,
//       contract_id: contract.contract_id,
//       site_id: contract.site_id,
//       worker_id,
//       date,
//       service_category: "General Service",
//       work_type: parsed.work_type || "repair",
//       description: parsed.description,
//       hours_worked: parsed.hours_worked,
//       rate_type: "normal",
//       hourly_rate: contract.hourly_rate,
//       materials: parsed.materials || [],
//       material_markup_percentage: contract.material_markup,
//       travel_cost: 0,
//       requires_approval: false,
//       certification_verified: true,
//       validation_notes: [],
//     });

//     // 🧠 STEP 5: Build work log
//     const workLog = buildWorkLog({
//       customer_id: contract.customer_id,
//       contract_id: contract.contract_id,
//       site_id: contract.site_id,
//       worker_id,
//       date,
//       service_category: "General Service",
//       work_type: parsed.work_type || "repair",
//       description: parsed.description,
//       hours_worked: parsed.hours_worked,
//       materials: invoiceItem.materials,
//       compliance_flags: [],
//       validation: {
//         billable: true,
//         prevented: false,
//         pendingApproval: false,
//         pendingReview: false,
//         reason: "Standard work within contract.",
//       },
//       invoice_item: invoiceItem,
//     });

//     // 🧠 STEP 6: Reply to technician
//     return res.json({
//       agent_reply: `Got it. Logged:\n- ${parsed.description}\n- ${parsed.hours_worked} hours`,
//       needs_follow_up: false,
//       work_log: workLog,
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       error: err.message || "Something went wrong",
//     });
//   }
// }

import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

import { loadData } from "../tools/dataLoader.js";
import { getWorkerById } from "../tools/workerTools.js";
import {
  findSiteAndCustomerFromMessage,
  detectServiceCategory,
  getHourlyRate,
  getMaterialMarkup,
  getApprovalLimit,
  isServiceCovered,
} from "../tools/contractTools.js";
import { findPotentialDuplicateWork } from "../tools/historyTools.js";
import {
  findMissingFields,
  buildFollowUpQuestions,
  buildWorkLog,
} from "../tools/reportTools.js";
import {
  buildInvoiceItem,
  checkApprovalRequired,
} from "../tools/billingTools.js";

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

    const { contracts, workers, workHistory } = loadData();

    const worker = getWorkerById(worker_id, workers);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const siteMatch = findSiteAndCustomerFromMessage(message, contracts);

    const extraction = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `
Extract structured work info from this technician message.

Message:
${message}

Return JSON only:
{
  "description": "...",
  "hours_worked": number,
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

    const contract = siteMatch?.customer || null;
    const site = siteMatch?.site || null;
    const serviceCategory = detectServiceCategory(message, contract);

    const missingFields = findMissingFields(
      {
        ...parsed,
        customer_id: contract?.customer_id,
        site_id: site?.site_id,
        service_category: serviceCategory,
      },
      { materialsLikelyRequired: true }
    );

    if (missingFields.length > 0) {
      const questions = buildFollowUpQuestions(missingFields);

      return res.json({
        agent_reply: `Got it, ${worker.name || worker.worker_name || worker_id}. I need a bit more info:\n- ${questions.join("\n- ")}`,
        needs_follow_up: true,
        missing_fields: missingFields,
        work_log: null,
      });
    }

    const duplicate = findPotentialDuplicateWork(
      message,
      site?.site_id,
      workHistory
    );

    if (duplicate) {
      const workLog = buildWorkLog({
        customer_id: contract?.customer_id || null,
        contract_id: contract?.contract_id || null,
        site_id: site?.site_id || null,
        worker_id,
        date,
        service_category: serviceCategory,
        work_type: parsed.work_type || "repair",
        description: parsed.description,
        hours_worked: parsed.hours_worked,
        materials: parsed.materials || [],
        compliance_flags: ["potential_duplicate_work"],
        validation: {
          billable: false,
          prevented: true,
          pendingApproval: false,
          pendingReview: false,
          reason: "Similar work appears to have already been completed recently.",
        },
        invoice_item: null,
      });

      return res.json({
        agent_reply: "Hold on — I found similar recent work at this site. Please review before doing this again.",
        needs_follow_up: false,
        missing_fields: [],
        work_log: workLog,
      });
    }

    const covered = isServiceCovered(contract, serviceCategory);
    const hourlyRate = getHourlyRate(contract, serviceCategory);
    const materialMarkup = getMaterialMarkup(contract);
    const approvalLimit = getApprovalLimit(contract);

    const invoiceItem = buildInvoiceItem({
      customer_id: contract?.customer_id || null,
      contract_id: contract?.contract_id || null,
      site_id: site?.site_id || null,
      worker_id,
      date,
      service_category: serviceCategory,
      work_type: parsed.work_type || "repair",
      description: parsed.description,
      hours_worked: parsed.hours_worked,
      rate_type: "normal",
      hourly_rate: hourlyRate,
      materials: parsed.materials || [],
      material_markup_percentage: materialMarkup,
      travel_cost: 0,
      requires_approval: false,
      certification_verified: true,
      validation_notes: [],
    });

    const requiresApproval = checkApprovalRequired(
      invoiceItem.total_cost,
      approvalLimit
    );

    const billable = covered;
    const pendingApproval = requiresApproval && billable;

    const workLog = buildWorkLog({
      customer_id: contract?.customer_id || null,
      contract_id: contract?.contract_id || null,
      site_id: site?.site_id || null,
      worker_id,
      date,
      service_category: serviceCategory,
      work_type: parsed.work_type || "repair",
      description: parsed.description,
      hours_worked: parsed.hours_worked,
      materials: parsed.materials || [],
      compliance_flags: [],
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
        ? { ...invoiceItem, requires_approval: pendingApproval }
        : null,
    });

    return res.json({
      agent_reply: pendingApproval
        ? "Got it. I logged the work, but this likely needs approval before billing."
        : `Got it. I logged the work${billable ? " and it looks billable under the contract." : ", but it does not appear billable under the contract."}`,
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