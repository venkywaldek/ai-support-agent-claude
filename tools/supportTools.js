export function getOrderStatus() {
  return "Your order #12345 has been shipped and will arrive tomorrow 🚚";
}

export function getRefundPolicy() {
  return "Refunds are available within 14 days of purchase if the item is unused and in original condition.";
}

export function getWorkingHours() {
  return "Our support team is available Monday to Friday, 9:00 AM to 4:00 PM.";
}

export function getHumanSupportContact() {
  return {
    phone: "+358 403 070 854",
    email: "support@company.com",
    hours: "Monday to Friday, 9:00 AM to 4:00 PM",
  };
}

export function getCurrentDateTime() {
  const now = new Date();
  return `Current date and time: ${now.toLocaleString()}`;
}

export function classifyTicket(message) {
  const text = message.toLowerCase();

  if (
    text.includes("angry") ||
    text.includes("complaint") ||
    text.includes("terrible") ||
    text.includes("bad service")
  ) {
    return "High Priority - Customer Complaint";
  }

  if (text.includes("refund") || text.includes("return")) {
    return "Medium Priority - Refund Request";
  }

  if (
    text.includes("order") ||
    text.includes("delivery") ||
    text.includes("shipping")
  ) {
    return "Normal - Order Inquiry";
  }

  return "General Inquiry";
}

export function getCompanyInfo(message) {
  const text = message.toLowerCase();

  const knowledgeBase = {
    shipping: "Shipping usually takes 2 to 5 business days.",
    pricing: "Our pricing starts at $29 per month.",
    support: "You can contact support at support@company.com.",
    cancellation: "You can cancel your subscription anytime from account settings.",
  };

  for (const key in knowledgeBase) {
    if (text.includes(key)) {
      return knowledgeBase[key];
    }
  }

  return null;
}

export function detectTool(message) {
  const text = message.toLowerCase();

  if (text.includes("order")) return "order";
  if (text.includes("refund") || text.includes("return")) return "refund";

  if (
    text.includes("working hours") ||
    text.includes("opening hours") ||
    text.includes("business hours") ||
    text.includes("hours")
  ) {
    return "hours";
  }

  if (
    text.includes("date") ||
    text.includes("time") ||
    text.includes("today")
  ) {
    return "datetime";
  }

  if (
    text.includes("classify") ||
    text.includes("priority") ||
    text.includes("urgent")
  ) {
    return "classify";
  }

  if (
    text.includes("shipping") ||
    text.includes("pricing") ||
    text.includes("support email") ||
    text.includes("cancel") ||
    text.includes("cancellation")
  ) {
    return "companyInfo";
  }

  if (
    text.includes("reply to this") ||
    text.includes("write a reply") ||
    text.includes("draft a reply")
  ) {
    return "aiReply";
  }

  if (
    text.includes("real person") ||
    text.includes("human") ||
    text.includes("call support") ||
    text.includes("talk to someone") ||
    text.includes("customer care") ||
    text.includes("representative") ||
    text.includes("agent")
  ) {
    return "humanSupport";
  }

  return null;
}