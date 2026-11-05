/** Starter skill catalogue for a new TNA cycle. Admin can edit everything afterwards. */

import { behaviourFor } from "./tna-skill-behaviours";

export type SeedSkill = {
  skill_type: "soft" | "technical";
  name: string;
  description: string | null;
  department: string | null;
  designation: string | null;
};

/** Soft skills — identical for every employee, drawn from ABHI's Vision, Mission and Core Values. */
export const SOFT_SKILLS: { name: string; description: string }[] = [
  { name: "Customer Centricity", description: "Puts the client first and delivers a respectful, dignified service experience." },
  { name: "Integrity & Ethics", description: "Acts honestly, protects confidentiality and follows the bank's code of conduct." },
  { name: "Financial Inclusion Mindset", description: "Understands the bank's mission of serving the unbanked and underserved." },
  { name: "Teamwork & Collaboration", description: "Works effectively across branches, wings and departments." },
  { name: "Communication Skills", description: "Communicates clearly and professionally in writing and in person." },
  { name: "Accountability & Ownership", description: "Owns commitments and delivers results without being chased." },
  { name: "Problem Solving & Decision Making", description: "Analyses situations and makes sound, timely decisions." },
  { name: "Adaptability & Innovation", description: "Embraces change, new tools and better ways of working." },
  { name: "Time & Priority Management", description: "Plans workload and meets deadlines consistently." },
  { name: "Leadership & People Development", description: "Guides, coaches and develops colleagues and reportees." },
  { name: "Courage", description: "Speaks up honestly, raises problems early and does the right thing under pressure." },
  { name: "Ciurosity", description: "Asks, learns and explores better ways of serving clients and improving work." },
  { name: "Comradery", description: "Works as one team, helps colleagues readily and celebrates shared success." },
  { name: "Compassion", description: "Listens with empathy and serves every client with care and dignity." },
  { name: "Credibility", description: "Keeps commitments and builds trust through consistent, honest actions." },
];

/**
 * Technical skills by department or sub-department.
 * `department: null` = applies to every employee.
 * Entries are matched against both the employee's department and sub-department,
 * so sub-department names (e.g. "CPU", "Treasury", "Cyber Security") work too.
 */
export const TECHNICAL_SKILLS: { department: string | null; skills: string[] }[] = [
  {
    department: null,
    skills: [
      "MS Excel & Reporting",
      "Core Banking System Usage",
      "AML / CFT & KYC Awareness",
      "Information Security & Data Privacy Awareness",
      "Regulatory Compliance (SBP Prudential Regulations)",
      "Business Writing & Email Etiquette",
      "Fraud Awareness & Whistle-blowing",
      "Digital Literacy & MS Office 365",
    ],
  },

  /* ------------------------------ Administration ------------------------------ */
  {
    department: "Administration",
    skills: [
      "Facilities & Premises Management",
      "Vendor Management & Negotiation",
      "Procurement & Purchase Process",
      "Fixed Assets & Inventory Control",
      "Insurance Policy Administration",
      "Fleet, Driver & Rider Management",
      "Health, Safety & Environment (HSE)",
      "Office Administration & Record Keeping",
      "Archiving, Stationery & Mail Management",
      "Buildout & Project Supervision (FAR)",
      "Utility & Expense Control",
    ],
  },
  { department: "Physical Infrastructure", skills: ["Civil & Electrical Works Supervision", "Preventive Maintenance Planning", "Contractor Quality Control"] },
  { department: "PMU & Fixed Assets", skills: ["Asset Tagging & Verification", "Depreciation & Asset Register Upkeep"] },
  { department: "Support Staff", skills: ["Housekeeping Standards", "Workplace Etiquette & Grooming"] },

  /* ---------------------- Branch Banking & Centralized Ops --------------------- */
  {
    department: "Branch Banking & Centralized Ops",
    skills: [
      "Branch Operations & Cash Handling",
      "Account Opening & CDD Documentation",
      "Teller Operations & Cash Balancing",
      "Reconciliation & Vouching",
      "Clearing, Remittance & Funds Transfer",
      "Service Level & Turnaround Management",
      "Branch Control & Operational Checklists",
      "Dormant, Deceased & Unclaimed Accounts Handling",
      "Vault, Key & Dual Custody Controls",
      "Complaint Handling at Branch Counter",
    ],
  },
  { department: "Centralized Operations", skills: ["Centralised Processing Controls", "Maker-Checker Discipline", "Exception & Error Log Management"] },
  { department: "CPU", skills: ["Document Verification & Scrutiny", "Loan Booking & Disbursement Processing", "Turnaround Time Monitoring"] },
  { department: "ADC Operations", skills: ["ATM & Debit Card Operations", "Dispute Resolution & Chargebacks", "Digital Channel Reconciliation", "Switch & Settlement Basics"] },
  { department: "Account Review", skills: ["Account Review & Periodic KYC Refresh", "Transaction Monitoring Basics"] },
  { department: "Branch Banking Operations", skills: ["Business Continuity Planning (Branch)", "Regional Operations Supervision", "Branch Audit Readiness"] },

  /* ---------------------------------- Credit ---------------------------------- */
  {
    department: "Credit",
    skills: [
      "Credit Appraisal & Analysis",
      "Cash Flow & Repayment Capacity Assessment",
      "Microfinance Lending Methodology",
      "Loan Documentation & Charge Creation",
      "Collateral & Security Evaluation",
      "Credit Policy & Delegated Authority",
      "Portfolio Quality & Delinquency Management",
      "Client Visit & Field Verification",
      "ECIB / Credit Bureau Interpretation",
      "Early Warning Signals & Watchlist",
      "Restructuring & Rescheduling",
      "Agri & Livestock Financing Basics",
      "Gold Backed & Secured Lending",
    ],
  },
  { department: "Credit Administration", skills: ["Credit Administration Controls", "Limit Setup & Monitoring", "Security Documentation Custody"] },
  { department: "Recovery", skills: ["Recovery & Collection Skills", "Legal Recovery Process", "Negotiation with Delinquent Clients", "Write-off & Settlement Handling"] },

  /* -------------------------------- Business ---------------------------------- */
  {
    department: "Business",
    skills: [
      "Sales Planning & Target Management",
      "Deposit Mobilisation",
      "Cross-Selling & Product Bundling",
      "Customer Relationship Management",
      "Market & Competitor Analysis",
      "Branch Profitability Management",
      "Client Onboarding Journey",
      "Field Sales Discipline & Route Planning",
      "Bancassurance & Third-Party Products",
    ],
  },
  { department: "Distribution", skills: ["Channel & Territory Management", "Sales Team Coaching"] },

  /* ------------------------------- Risk Management ----------------------------- */
  {
    department: "Risk Management",
    skills: [
      "Credit Risk Management",
      "Operational Risk & Control Testing (RCSA)",
      "Market & Liquidity Risk",
      "Risk Reporting & Dashboards",
      "Risk Appetite & Key Risk Indicators",
      "Business Continuity & Disaster Recovery",
      "Basel & SBP Risk Guidelines",
      "Data Analytics for Risk",
    ],
  },
  { department: "Information Security", skills: ["Information Security Management (ISO 27001)", "Security Incident Response", "Vulnerability Assessment", "Penetration Testing", "Identity & Access Management"] },
  { department: "Cyber Security", skills: ["Cyber Security Architecture", "Threat Intelligence & Hunting", "Endpoint & Network Security", "Cloud Security Fundamentals"] },
  { department: "Security Operation Center", skills: ["SOC Monitoring & SIEM Tools", "Log Analysis & Triage", "Incident Escalation Playbooks"] },
  { department: "Data Scientist", skills: ["Statistical Modelling", "Python / R for Analytics", "Scorecard Development"] },
  { department: "ECIB", skills: ["ECIB Reporting & Data Quality", "Credit Bureau Reconciliation"] },

  /* --------------------------------- Compliance -------------------------------- */
  {
    department: "Compliance",
    skills: [
      "Regulatory Reporting",
      "Compliance Monitoring & Testing",
      "AML / CFT Transaction Monitoring",
      "Sanctions & Watchlist Screening",
      "STR / CTR Reporting",
      "Complaint Handling & Redressal",
      "Fair Treatment of Consumers",
      "Compliance Risk Assessment",
    ],
  },

  /* ----------------------------------- Audit ----------------------------------- */
  {
    department: "Audit",
    skills: [
      "Internal Audit Methodology",
      "Risk Based Audit Planning",
      "Audit Sampling & Evidence",
      "Branch & Process Audit Execution",
      "Audit Report Writing",
      "Fraud Investigation & Interviewing",
      "IT / Information Systems Audit",
      "Follow-up & Issue Closure",
    ],
  },

  /* ---------------------------------- Finance ---------------------------------- */
  {
    department: "Finance",
    skills: [
      "Financial Reporting (IFRS / IFRS 9)",
      "Budgeting & Forecasting",
      "Management Reporting & MIS",
      "Taxation & Withholding",
      "Cost & Profitability Analysis",
      "Payables, Payroll & Expense Control",
      "Regulatory Returns to SBP",
      "Fund Transfer Pricing Basics",
    ],
  },
  { department: "Treasury", skills: ["Treasury Dealing & Money Market", "Liquidity & Cash Flow Management", "ALM & Gap Analysis", "Investment Portfolio Management", "Treasury Back Office Settlement"] },

  /* ------------------------------ Information Tech ----------------------------- */
  {
    department: "Information Technology",
    skills: [
      "Network & Infrastructure Support",
      "Database Administration (SQL)",
      "Core Banking Application Support",
      "Digital Channels & API Support",
      "Software Development Lifecycle",
      "IT Service Management & Helpdesk",
      "Backup, DR & System Availability",
      "Change & Release Management",
      "Business Analysis & Requirement Writing",
      "QA & System Testing",
    ],
  },
  { department: "Digital", skills: ["Digital Product Management", "Mobile & Internet Banking Operations", "UX Fundamentals", "Digital Adoption & Customer Education"] },

  /* -------------------------------- Human Resource ----------------------------- */
  {
    department: "Human Resource",
    skills: [
      "Talent Acquisition & Interviewing",
      "Performance Management",
      "HR Analytics & Headcount Reporting",
      "Employee Relations & Labour Law",
      "Compensation & Benefits",
      "HRMS Administration",
      "Employee Engagement & Culture",
      "Grievance & Disciplinary Handling",
    ],
  },
  { department: "Learning", skills: ["Training Need Assessment", "Training Design & Facilitation", "Kirkpatrick Evaluation of Training", "E-learning Content Development"] },

  /* ----------------------------------- Legal ----------------------------------- */
  { department: "Legal", skills: ["Contract Drafting & Review", "Litigation Management", "Banking & Financial Law", "Regulatory Correspondence"] },

  /* --------------------------------- Marketing --------------------------------- */
  { department: "Marketing", skills: ["Brand & Campaign Management", "Digital Marketing & Social Media", "Market Research", "Content & Collateral Development"] },

  /* ----------------------------- Customer Experience --------------------------- */
  { department: "Customer Experience", skills: ["Service Quality Standards", "Call Centre Handling Skills", "Root Cause Analysis of Complaints", "Customer Journey Mapping"] },

  /* ---------------------------------- Security --------------------------------- */
  {
    department: "Security",
    skills: [
      "Physical Security & Premises Protection",
      "CCTV & Control Room Monitoring",
      "Cash Movement & Escort Security",
      "Emergency & Evacuation Drills",
      "Access Control & Visitor Management",
      "Protocol & Front Desk Handling",
    ],
  },

  /* --------------------------------- Strategy ---------------------------------- */
  { department: "Strategy", skills: ["Strategic Planning & Execution", "Business Case Development", "Project & Programme Management", "Performance Scorecards (BSC)"] },
];

/** Leadership / role-based technical skills matched on the employee's designation. */
export const DESIGNATION_SKILLS: { designation: string; skills: string[] }[] = [
  { designation: "Head", skills: ["Strategic Leadership", "Budget Ownership & Cost Control", "Succession Planning"] },
  { designation: "Chief", skills: ["Enterprise Governance", "Board & Regulator Engagement"] },
  { designation: "Manager", skills: ["People Management & Delegation", "Performance Coaching & Feedback", "Process Improvement"] },
  { designation: "Team Lead", skills: ["Team Supervision & Workload Planning", "On-the-job Coaching"] },
  { designation: "Supervisor", skills: ["Shift & Roster Supervision", "Quality Checking of Team Output"] },
  { designation: "Officer", skills: ["Process Accuracy & Checklist Discipline", "Customer Handling at Desk"] },
  { designation: "Trainee", skills: ["Banking Fundamentals", "Learning Agility & Onboarding"] },
];

export function seedSkills(): SeedSkill[] {
  const out: SeedSkill[] = SOFT_SKILLS.map((s) => ({
    skill_type: "soft" as const,
    name: s.name,
    description: behaviourFor(s.name) ?? s.description,
    department: null,
    designation: null,
  }));
  for (const group of TECHNICAL_SKILLS) {
    for (const name of group.skills) {
      out.push({
        skill_type: "technical",
        name,
        description: behaviourFor(name),
        department: group.department,
        designation: null,
      });
    }
  }
  for (const group of DESIGNATION_SKILLS) {
    for (const name of group.skills) {
      out.push({
        skill_type: "technical",
        name,
        description: behaviourFor(name),
        department: null,
        designation: group.designation,
      });
    }
  }
  return out;
}

const norm = (v: string | null | undefined) => (v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Does a skill apply to this employee? Blank department/designation on a skill = applies to everyone. */
export function skillApplies(
  skill: { skill_type: string; department: string | null; designation: string | null },
  staff: { department?: string | null; sub_department?: string | null; designation?: string | null },
): boolean {
  if (skill.skill_type === "soft") return true;
  if (skill.department) {
    const d = norm(skill.department);
    const emp = `${norm(staff.department)} ${norm(staff.sub_department)}`;
    if (!emp.includes(d) && !d.split(" ").some((w) => w.length > 3 && emp.includes(w))) return false;
  }
  if (skill.designation) {
    const s = norm(skill.designation);
    if (!norm(staff.designation).includes(s)) return false;
  }
  return true;
}
