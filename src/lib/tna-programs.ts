/**
 * Maps individual TNA skill gaps onto a single training programme, so one course
 * can close several related gaps for a group of employees at the same time.
 */

type Rule = { program: string; keywords: string[] };

const RULES: Rule[] = [
  { program: "Leadership & People Management", keywords: ["leadership", "people management", "delegation", "coaching", "succession", "team supervision", "shift", "performance coaching", "enterprise governance", "strategic leadership"] },
  { program: "Customer Excellence & Service Quality", keywords: ["customer centricity", "customer handling", "service quality", "customer journey", "call centre", "complaint", "front desk", "relationship management", "fair treatment"] },
  { program: "Business Communication & Professional Writing", keywords: ["communication", "business writing", "email", "report writing", "presentation"] },
  { program: "Personal Effectiveness & Ownership", keywords: ["time", "priority", "accountability", "ownership", "adaptability", "innovation", "problem solving", "decision making", "teamwork", "collaboration", "learning agility", "workplace etiquette"] },
  { program: "Ethics, Integrity & Financial Inclusion", keywords: ["integrity", "ethics", "financial inclusion", "code of conduct", "whistle"] },
  { program: "Credit Appraisal & Portfolio Quality", keywords: ["credit appraisal", "cash flow", "microfinance lending", "credit policy", "portfolio quality", "delinquency", "early warning", "restructuring", "client visit", "agri", "gold", "collateral", "loan documentation", "credit risk", "ecib", "credit bureau", "limit setup", "credit administration", "digital credit"] },
  { program: "Recovery & Collections", keywords: ["recovery", "collection", "delinquent", "write-off", "legal recovery"] },
  { program: "Branch Banking Operations & Controls", keywords: ["branch operations", "cash handling", "teller", "account opening", "reconciliation", "vouching", "clearing", "remittance", "vault", "branch control", "dormant", "branch audit", "regional operations", "turnaround", "service level", "maker-checker", "centralised", "centralized", "exception", "document verification", "loan booking", "account review"] },
  { program: "Digital Channels & Card Operations", keywords: ["atm", "debit card", "chargeback", "dispute", "digital channel", "switch", "mobile", "internet banking", "digital product", "digital adoption", "api"] },
  { program: "AML / CFT, KYC & Compliance", keywords: ["aml", "cft", "kyc", "sanction", "screening", "transaction monitoring", "str", "ctr", "compliance", "regulatory reporting", "prudential", "regulatory returns", "regulatory correspondence"] },
  { program: "Information Security & Cyber Awareness", keywords: ["information security", "data privacy", "cyber", "soc", "siem", "penetration", "vulnerability", "incident response", "identity & access", "endpoint", "threat", "cloud security", "qa & system security"] },
  { program: "Risk Management Essentials", keywords: ["risk management", "operational risk", "market & liquidity", "risk reporting", "risk appetite", "key risk", "basel", "business continuity", "disaster recovery", "rcsa", "control testing"] },
  { program: "Fraud Prevention & Investigation", keywords: ["fraud"] },
  { program: "Internal Audit Skills", keywords: ["audit methodology", "audit planning", "audit sampling", "audit execution", "issue closure", "information systems audit", "audit readiness"] },
  { program: "Finance, Budgeting & Reporting", keywords: ["financial reporting", "ifrs", "budgeting", "forecasting", "taxation", "profitability", "payables", "payroll", "management reporting", "fund transfer pricing", "cost"] },
  { program: "Treasury & ALM", keywords: ["treasury", "money market", "liquidity & cash", "alm", "investment portfolio", "settlement"] },
  { program: "Data, Excel & Analytics", keywords: ["excel", "analytics", "dashboard", "statistical", "python", "scorecard", "database", "sql", "mis", "hr analytics", "data quality"] },
  { program: "Core Banking & Digital Literacy", keywords: ["core banking", "digital literacy", "office 365", "banking fundamentals", "process accuracy", "checklist"] },
  { program: "IT Infrastructure & Application Support", keywords: ["network", "infrastructure", "application support", "software development", "service management", "helpdesk", "backup", "change & release", "business analysis", "system testing", "ux"] },
  { program: "Sales, Deposit Mobilisation & Cross-Selling", keywords: ["sales", "deposit", "cross-selling", "market & competitor", "territory", "channel", "bancassurance", "branch profitability", "client onboarding", "field sales", "market research", "brand", "campaign", "digital marketing", "content"] },
  { program: "HR & Talent Management", keywords: ["talent acquisition", "performance management", "employee relations", "labour law", "compensation", "hrms", "engagement", "grievance", "training need", "training design", "kirkpatrick", "e-learning"] },
  { program: "Administration, Facilities & Vendor Management", keywords: ["facilities", "vendor", "procurement", "fixed asset", "insurance", "fleet", "hse", "office administration", "archiving", "stationery", "buildout", "utility", "civil", "maintenance", "contractor", "asset tagging", "depreciation", "housekeeping", "inventory"] },
  { program: "Physical Security & Safety", keywords: ["physical security", "cctv", "control room", "cash movement", "evacuation", "access control", "visitor", "protocol", "premises"] },
  { program: "Strategy, Projects & Governance", keywords: ["strategic planning", "business case", "project", "programme management", "scorecard", "governance", "board"] },
  { program: "Legal & Contracts", keywords: ["contract", "litigation", "banking & financial law"] },
];

/** Returns the training programme that covers a given skill gap. */
export function programForSkill(skillName: string): string {
  const n = skillName.toLowerCase();
  for (const r of RULES) {
    if (r.keywords.some((k) => n.includes(k))) return r.program;
  }
  return skillName;
}
