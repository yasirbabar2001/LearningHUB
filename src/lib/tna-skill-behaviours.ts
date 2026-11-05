/**
 * Observable behaviours for every competency in the TNA catalogue.
 * Shown to line managers under each skill so ratings are based on what the
 * person actually does, not on a job title or a general impression.
 */

/** What each point on the rating scale means, in behavioural terms. */
export const RATING_ANCHORS: { value: number; label: string; meaning: string }[] = [
  { value: 1, label: "Needs major development", meaning: "Rarely shows the behaviour; needs step-by-step direction and constant rework." },
  { value: 2, label: "Needs development", meaning: "Shows the behaviour occasionally; needs regular supervision and correction." },
  { value: 3, label: "Partially proficient", meaning: "Shows the behaviour on routine work; still needs help on complex or unusual cases." },
  { value: 4, label: "Proficient", meaning: "Consistently shows the behaviour on their own, with only occasional guidance." },
  { value: 5, label: "Fully proficient / expert", meaning: "Always shows the behaviour, handles exceptions and coaches others in it." },
];

const B: Record<string, string> = {
  /* ------------------------------- Soft skills ------------------------------- */
  "Customer Centricity":
    "Greets every client respectfully, listens before responding, explains products in the client's own language, follows through on promises and treats low-income clients with the same dignity as large ones.",
  "Integrity & Ethics":
    "Declares conflicts of interest, never shares client or bank information outside approved channels, refuses gifts or favours, reports wrongdoing and follows the code of conduct even under pressure.",
  "Financial Inclusion Mindset":
    "Explains how their work serves unbanked and underserved clients, looks for ways to bring first-time clients into the bank, and avoids attitudes or shortcuts that exclude rural, female or low-literacy clients.",
  "Teamwork & Collaboration":
    "Shares information proactively with other branches, wings and departments, helps colleagues at peak times, responds to internal requests promptly and resolves disagreements without escalating personally.",
  "Communication Skills":
    "Speaks and writes clearly and briefly, confirms understanding, keeps a professional tone with clients and colleagues, and raises problems early instead of leaving people uninformed.",
  "Accountability & Ownership":
    "Accepts tasks with clear commitments, meets them without reminders, admits mistakes quickly, fixes them and does not pass blame or wait to be chased.",
  "Problem Solving & Decision Making":
    "Gathers facts, identifies the real cause, weighs options against policy and risk, decides within their authority in good time and escalates only what genuinely needs escalating.",
  "Adaptability & Innovation":
    "Adopts new systems, policies and ways of working without resistance, stays effective when priorities change and suggests practical improvements to existing processes.",
  "Time & Priority Management":
    "Plans the day and week, distinguishes urgent from important, meets deadlines and reporting cut-offs consistently and flags slippage before it happens.",
  "Leadership & People Development":
    "Sets clear expectations, gives regular feedback and on-the-job coaching, recognises good work, addresses poor performance early and develops successors.",

  /* --------------------- Core values (the five Cs) --------------------- */
  "Courage":
    "Speaks up honestly in meetings and with clients even when it is uncomfortable, raises problems and mistakes early, takes ownership of difficult cases, and makes the right call under pressure instead of the easy one.",
  "Ciurosity":
    "Asks questions to understand clients, products and processes deeply, explores new tools and ways of working, learns from feedback and from colleagues in other branches, and turns what they learn into practical improvements.",
  "Comradery":
    "Treats colleagues as one team across branches and departments, celebrates others' successes, steps in to help during peak times without being asked, and builds an environment where everyone feels they belong.",
  "Compassion":
    "Listens patiently to clients and colleagues, understands individual circumstances before deciding, supports colleagues through difficulties, and serves low-income and vulnerable clients with extra care and dignity.",
  "Credibility":
    "Keeps promises and meets commitments, gives accurate and complete information, admits what they do not know, follows through on every assurance given to clients and colleagues, and builds trust through consistent actions.",
  /* Aliases in case the names are ever corrected to standard spellings. */
  "Curiosity":
    "Asks questions to understand clients, products and processes deeply, explores new tools and ways of working, learns from feedback and from colleagues in other branches, and turns what they learn into practical improvements.",
  "Camaraderie":
    "Treats colleagues as one team across branches and departments, celebrates others' successes, steps in to help during peak times without being asked, and builds an environment where everyone feels they belong.",

  /* ------------------------------ Common technical ----------------------------- */
  "MS Excel & Reporting":
    "Builds clean worksheets, uses formulas, lookups, filters and pivot tables, checks totals before circulation and produces accurate reports on time without manual rework.",
  "Core Banking System Usage":
    "Navigates the core banking screens confidently, posts entries and enquiries correctly the first time, uses the right menus and reports and knows what to do when a transaction fails.",
  "AML / CFT & KYC Awareness":
    "Verifies customer identity and source of funds, applies the correct CDD level, spots unusual transaction patterns and raises concerns to compliance promptly.",
  "Information Security & Data Privacy Awareness":
    "Protects passwords and screens, avoids sharing client data on personal channels, recognises phishing attempts and reports security incidents immediately.",
  "Regulatory Compliance (SBP Prudential Regulations)":
    "Applies the relevant prudential regulations in daily work, keeps documentation as required, follows circulars when they are issued and asks compliance when unsure.",
  "Business Writing & Email Etiquette":
    "Writes short, structured and error-free emails and memos, uses correct addressees and subject lines, responds within agreed timelines and keeps written records professional.",
  "Fraud Awareness & Whistle-blowing":
    "Recognises common fraud red flags, follows dual controls, does not bypass a control to oblige anyone and reports suspicions through the whistle-blowing channel.",
  "Digital Literacy & MS Office 365":
    "Uses Word, Excel, Outlook, Teams and shared drives effectively, manages files and versions properly and learns new digital tools without hand-holding.",

  /* ------------------------------ Administration ------------------------------ */
  "Facilities & Premises Management":
    "Keeps premises functional, clean and compliant, responds quickly to faults, tracks recurring issues and plans upkeep instead of reacting to breakdowns.",
  "Vendor Management & Negotiation":
    "Selects vendors on merit, negotiates rates and terms firmly and fairly, monitors service against the contract and escalates non-performance with evidence.",
  "Procurement & Purchase Process":
    "Follows the approved procurement steps, obtains comparative quotes, prepares complete purchase documentation and avoids after-the-fact approvals.",
  "Fixed Assets & Inventory Control":
    "Maintains an accurate asset and stock register, performs physical counts, reconciles differences and controls issuance and disposal with proper approvals.",
  "Insurance Policy Administration":
    "Keeps policies current and adequate, renews before expiry, files claims completely and tracks them to settlement.",
  "Fleet, Driver & Rider Management":
    "Schedules vehicles and riders efficiently, keeps documents, fuel and maintenance records current and enforces safe driving rules.",
  "Health, Safety & Environment (HSE)":
    "Identifies hazards, keeps safety equipment ready and tested, runs drills and corrects unsafe practices on the spot.",
  "Office Administration & Record Keeping":
    "Keeps office services running smoothly, maintains files so anything can be retrieved quickly and meets record-retention requirements.",
  "Archiving, Stationery & Mail Management":
    "Indexes and stores records securely, controls stationery issuance against consumption and ensures inward and outward mail is tracked and delivered.",
  "Buildout & Project Supervision (FAR)":
    "Plans branch buildouts to layout and budget, supervises contractors on site, tracks milestones and closes snags before handover.",
  "Utility & Expense Control":
    "Monitors utility and administrative expenses, checks bills against usage, questions abnormal charges and keeps spending within budget.",
  "Civil & Electrical Works Supervision":
    "Checks work against specification and safety standards, spots substandard material or workmanship and refuses to certify incomplete work.",
  "Preventive Maintenance Planning":
    "Prepares and follows a maintenance calendar, gets servicing done on schedule and reduces repeated breakdowns.",
  "Contractor Quality Control":
    "Inspects contractor output against agreed scope, records defects, enforces rectification and links payment to verified completion.",
  "Asset Tagging & Verification":
    "Tags assets on receipt, records location and custodian and completes physical verification with documented explanations for differences.",
  "Depreciation & Asset Register Upkeep":
    "Keeps the asset register aligned with the ledger, applies correct depreciation and records additions, transfers and disposals on time.",
  "Housekeeping Standards":
    "Maintains cleanliness of banking hall, washrooms and back office throughout the day and responds immediately when standards slip.",
  "Workplace Etiquette & Grooming":
    "Maintains dress code and personal presentation, is punctual and courteous with clients and staff and behaves professionally in all areas.",

  /* ---------------------- Branch Banking & Centralized Ops --------------------- */
  "Branch Operations & Cash Handling":
    "Opens and closes the branch as per procedure, handles cash accurately with correct limits and custody, and completes daily operational tasks without exceptions.",
  "Account Opening & CDD Documentation":
    "Collects and verifies complete documentation, screens the customer, completes system fields correctly and avoids deferrals and re-work on accounts opened.",
  "Teller Operations & Cash Balancing":
    "Processes deposits, withdrawals and cheques accurately and quickly, counts and checks notes, and balances the till with no unexplained differences.",
  "Reconciliation & Vouching":
    "Reconciles accounts and suspense items regularly, matches vouchers to entries, clears items promptly and escalates ageing differences.",
  "Clearing, Remittance & Funds Transfer":
    "Handles clearing, IBFT, cheques and remittances within cut-offs, verifies beneficiary details and resolves returns and unposted items quickly.",
  "Service Level & Turnaround Management":
    "Tracks turnaround against agreed service standards, keeps clients informed of status and removes bottlenecks rather than accepting delays.",
  "Branch Control & Operational Checklists":
    "Completes daily and periodic control checklists honestly, acts on exceptions and does not sign off controls that were not actually performed.",
  "Dormant, Deceased & Unclaimed Accounts Handling":
    "Applies the correct process for dormancy, reactivation, deceased claims and unclaimed balances with full documentation and approvals.",
  "Vault, Key & Dual Custody Controls":
    "Maintains dual custody without exception, records vault movements, keeps keys secure and never shares combinations or keys informally.",
  "Complaint Handling at Branch Counter":
    "Listens to the complaint calmly, logs it in the system, resolves within authority or escalates the same day and closes the loop with the client.",
  "Centralised Processing Controls":
    "Applies the standard processing controls on every case, detects deviations before release and keeps processing quality consistent under volume.",
  "Maker-Checker Discipline":
    "Never performs both maker and checker roles, checks substance rather than rubber-stamping, and returns incorrect entries with clear reasons.",
  "Exception & Error Log Management":
    "Records exceptions and errors honestly, analyses repeat causes, closes items within timelines and reports trends to the supervisor.",
  "Document Verification & Scrutiny":
    "Checks documents for completeness, authenticity and consistency, detects altered or missing information and does not process on incomplete files.",
  "Loan Booking & Disbursement Processing":
    "Books loans with correct product, rate, tenor and schedule, disburses only after conditions are met and corrects data errors before release.",
  "Turnaround Time Monitoring":
    "Measures each stage against target, identifies where files are stuck and follows up until the case is closed within the standard.",
  "ATM & Debit Card Operations":
    "Manages card issuance, ATM cash loading, uptime and journal checks, and resolves customer card issues within prescribed timelines.",
  "Dispute Resolution & Chargebacks":
    "Logs disputes promptly, gathers evidence, raises chargebacks within scheme timelines and keeps the customer informed until settlement.",
  "Digital Channel Reconciliation":
    "Reconciles digital channel transactions daily, identifies unmatched and failed items and resolves customer-impacting entries first.",
  "Switch & Settlement Basics":
    "Understands the transaction flow through the switch, reads settlement files and identifies where a failed transaction is stuck.",
  "Account Review & Periodic KYC Refresh":
    "Runs reviews on schedule, updates customer information and risk ratings, and chases missing documentation until the file is complete.",
  "Transaction Monitoring Basics":
    "Reviews alerts and account activity against the customer profile, documents the rationale for closing or escalating an alert.",
  "Business Continuity Planning (Branch)":
    "Knows the branch continuity plan, keeps contact and fallback arrangements current, and can run critical services during a disruption.",
  "Regional Operations Supervision":
    "Visits and reviews branches on a plan, checks controls and service quality, documents findings and follows up until corrected.",
  "Branch Audit Readiness":
    "Keeps records, registers and controls audit-ready at all times, resolves prior audit points before the next visit and does not prepare only at audit time.",

  /* ---------------------------------- Credit ---------------------------------- */
  "Credit Appraisal & Analysis":
    "Assesses the business, character and capacity of the borrower, verifies figures independently and writes a balanced recommendation with clear risks and mitigants.",
  "Cash Flow & Repayment Capacity Assessment":
    "Builds a realistic household and business cash flow, tests instalment affordability and does not lend beyond demonstrated repayment capacity.",
  "Microfinance Lending Methodology":
    "Applies group and individual lending methodology correctly, conducts proper client selection, follows meeting discipline and understands the social collateral model.",
  "Loan Documentation & Charge Creation":
    "Prepares complete, correctly executed loan documents, ensures charges and securities are properly created and registered, and clears deferrals quickly.",
  "Collateral & Security Evaluation":
    "Values and verifies security realistically, confirms ownership and enforceability, and applies the correct margins.",
  "Credit Policy & Delegated Authority":
    "Knows the policy limits and approval matrix, works within authority, documents exceptions and obtains the right level of approval before commitment.",
  "Portfolio Quality & Delinquency Management":
    "Monitors PAR and ageing, acts on the first missed instalment, plans branch-wise recovery actions and prevents slippage into higher buckets.",
  "Client Visit & Field Verification":
    "Physically visits the business and residence, verifies what the file claims, records observations honestly and never accepts second-hand verification.",
  "ECIB / Credit Bureau Interpretation":
    "Reads bureau reports correctly, identifies overdues, multiple borrowing and over-indebtedness, and reflects the findings in the credit decision.",
  "Early Warning Signals & Watchlist":
    "Spots deteriorating signs early, puts accounts on the watchlist, records the trigger and initiates corrective action before default.",
  "Restructuring & Rescheduling":
    "Assesses whether restructuring is genuinely viable, applies policy and classification rules correctly and documents the revised terms fully.",
  "Agri & Livestock Financing Basics":
    "Understands crop and livestock cycles, aligns repayments with harvest or sale income and assesses agricultural risks realistically.",
  "Gold Backed & Secured Lending":
    "Follows gold appraisal, purity testing, storage and release procedures exactly, and maintains dual custody of pledged items.",
  "Credit Administration Controls":
    "Releases limits only against complete documentation, maintains the deferral register and enforces conditions before disbursement.",
  "Limit Setup & Monitoring":
    "Sets limits in the system accurately, monitors utilisation and excesses daily and reports breaches immediately.",
  "Security Documentation Custody":
    "Keeps original security documents under dual custody, records movements in the register and reconciles holdings periodically.",
  "Recovery & Collection Skills":
    "Plans contact and field visits by bucket, uses firm and respectful collection conversations, secures workable repayment commitments and follows them up.",
  "Legal Recovery Process":
    "Initiates legal action with complete documentation, coordinates with counsel, tracks case milestones and follows through to decree or settlement.",
  "Negotiation with Delinquent Clients":
    "Understands the borrower's real situation, negotiates realistic arrangements within policy, records commitments in writing and does not promise concessions beyond authority.",
  "Write-off & Settlement Handling":
    "Prepares justified settlement and write-off proposals with recovery history, obtains correct approvals and ensures post-write-off follow-up continues.",

  /* -------------------------------- Business ---------------------------------- */
  "Sales Planning & Target Management":
    "Breaks the annual target into monthly and daily activity, tracks achievement, corrects shortfalls early and does not rely on end-of-period pushes.",
  "Deposit Mobilisation":
    "Identifies and pursues deposit opportunities, builds a stable low-cost deposit base and retains existing depositors.",
  "Cross-Selling & Product Bundling":
    "Identifies genuine client needs, offers the right additional products and explains features and charges honestly rather than pushing volume.",
  "Customer Relationship Management":
    "Maintains regular contact with key clients, keeps records of interactions, resolves their issues quickly and retains relationships over time.",
  "Market & Competitor Analysis":
    "Tracks competitor pricing and offerings in the catchment area, gathers client feedback and uses it to adjust the local sales approach.",
  "Branch Profitability Management":
    "Understands the branch's income, cost and portfolio drivers and takes actions that improve profitability rather than volume alone.",
  "Client Onboarding Journey":
    "Guides the client from first contact to activated account or disbursed loan, minimises repeat visits and sets correct expectations on timelines.",
  "Field Sales Discipline & Route Planning":
    "Plans daily routes and client calls, records visits, meets the activity standard and uses field time productively.",
  "Bancassurance & Third-Party Products":
    "Explains cover, exclusions and charges clearly, completes documentation correctly and never mis-sells to meet a target.",
  "Channel & Territory Management":
    "Allocates territories and channels sensibly, balances workload across the team and monitors coverage and productivity by area.",
  "Sales Team Coaching":
    "Joins field visits, observes and gives specific feedback, models good selling behaviour and lifts weaker performers.",

  /* ------------------------------- Risk Management ----------------------------- */
  "Credit Risk Management":
    "Identifies credit risk concentrations and trends, tests portfolio quality independently and challenges weak lending proposals with evidence.",
  "Operational Risk & Control Testing (RCSA)":
    "Runs risk and control self-assessments with process owners, tests whether controls actually work and tracks remediation to closure.",
  "Market & Liquidity Risk":
    "Monitors rate, price and liquidity exposures against limits, explains movements and escalates breaches promptly.",
  "Risk Reporting & Dashboards":
    "Produces accurate, timely risk reports that highlight what matters, with clear commentary rather than raw numbers.",
  "Risk Appetite & Key Risk Indicators":
    "Defines and monitors KRIs against appetite, spots threshold breaches early and drives action rather than only reporting.",
  "Business Continuity & Disaster Recovery":
    "Maintains and tests continuity and recovery plans, documents test results and closes gaps found during drills.",
  "Basel & SBP Risk Guidelines":
    "Applies the relevant regulatory risk guidelines correctly in assessments and reporting and keeps up with new circulars.",
  "Data Analytics for Risk":
    "Uses data to find patterns and outliers, validates the data before drawing conclusions and turns analysis into practical risk actions.",
  "Information Security Management (ISO 27001)":
    "Maintains policies, controls and evidence in line with the standard, runs reviews on schedule and closes non-conformities.",
  "Security Incident Response":
    "Detects, classifies and contains incidents quickly, follows the response playbook, preserves evidence and completes post-incident review.",
  "Vulnerability Assessment":
    "Scans systems on schedule, prioritises findings by real risk, drives patching with owners and verifies remediation.",
  "Penetration Testing":
    "Plans and executes authorised tests safely, documents exploitable findings clearly and retests after fixes.",
  "Identity & Access Management":
    "Grants access on least privilege, reviews entitlements periodically, removes access on exit or transfer promptly and controls privileged accounts.",
  "Cyber Security Architecture":
    "Designs layered controls into new systems and changes, reviews architecture against threats and rejects insecure designs.",
  "Threat Intelligence & Hunting":
    "Tracks relevant threats, proactively searches for indicators in the environment and converts intelligence into detection rules.",
  "Endpoint & Network Security":
    "Keeps endpoint and network defences configured, updated and monitored, and investigates alerts rather than clearing them.",
  "Cloud Security Fundamentals":
    "Applies secure configuration, identity control and logging in cloud services and understands the shared responsibility model.",
  "SOC Monitoring & SIEM Tools":
    "Monitors dashboards and alerts through the shift, uses the SIEM effectively and hands over open items clearly.",
  "Log Analysis & Triage":
    "Reads logs to reconstruct what happened, separates noise from real events and documents the triage rationale.",
  "Incident Escalation Playbooks":
    "Follows the defined escalation path and timelines, informs the right stakeholders and does not sit on a serious incident.",
  "Statistical Modelling":
    "Selects appropriate techniques, tests assumptions, validates model performance and explains limitations to non-technical users.",
  "Python / R for Analytics":
    "Writes reusable, documented scripts, handles data cleaning properly and produces reproducible analysis.",
  "Scorecard Development":
    "Builds and validates scorecards on sound data, monitors performance drift and recommends recalibration when needed.",
  "ECIB Reporting & Data Quality":
    "Submits complete and accurate bureau data within timelines and corrects rejected or disputed records quickly.",
  "Credit Bureau Reconciliation":
    "Reconciles reported data with the core system, investigates mismatches and prevents recurring data errors.",

  /* --------------------------------- Compliance -------------------------------- */
  "Regulatory Reporting":
    "Prepares regulatory returns accurately and before the deadline, reconciles them to source data and retains support for every figure.",
  "Compliance Monitoring & Testing":
    "Executes the monitoring plan, tests samples objectively, documents findings with evidence and follows up on corrective actions.",
  "AML / CFT Transaction Monitoring":
    "Reviews alerts within timelines, investigates in depth, documents the decision rationale and escalates genuine suspicion.",
  "Sanctions & Watchlist Screening":
    "Screens at the right points, clears or escalates hits with documented reasoning and never overrides a true match.",
  "STR / CTR Reporting":
    "Identifies reportable activity, prepares complete and timely reports, maintains strict confidentiality and avoids tipping off.",
  "Complaint Handling & Redressal":
    "Logs every complaint, investigates the root cause, responds within regulatory timelines and tracks recurring themes.",
  "Fair Treatment of Consumers":
    "Ensures disclosures, charges and product suitability are transparent, and challenges practices that disadvantage clients.",
  "Compliance Risk Assessment":
    "Identifies obligations by process, assesses the exposure realistically and prioritises monitoring where the risk is highest.",

  /* ----------------------------------- Audit ----------------------------------- */
  "Internal Audit Methodology":
    "Follows the audit lifecycle from planning to closure, documents workpapers to standard and supports every conclusion with evidence.",
  "Risk Based Audit Planning":
    "Allocates audit effort to the highest-risk units and processes and justifies the plan with risk data, not history alone.",
  "Audit Sampling & Evidence":
    "Chooses defensible samples, obtains sufficient and reliable evidence and does not generalise beyond what the evidence supports.",
  "Branch & Process Audit Execution":
    "Completes fieldwork on schedule, tests controls in practice, discusses findings with the auditee and avoids surprises in the report.",
  "Audit Report Writing":
    "Writes clear findings with condition, cause, impact and recommendation, rates issues consistently and avoids vague observations.",
  "Fraud Investigation & Interviewing":
    "Plans investigations, secures evidence, conducts fair and structured interviews and reports conclusions objectively.",
  "IT / Information Systems Audit":
    "Tests system access, change and data controls, understands the application flow and reports technical issues in business terms.",
  "Follow-up & Issue Closure":
    "Verifies that agreed actions were actually implemented and effective before closing an issue, and escalates overdue items.",

  /* ---------------------------------- Finance ---------------------------------- */
  "Financial Reporting (IFRS / IFRS 9)":
    "Prepares accurate statements on the reporting calendar, applies the relevant standards including ECL, and explains variances with support.",
  "Budgeting & Forecasting":
    "Builds budgets on realistic assumptions, updates forecasts as conditions change and explains deviations with causes and actions.",
  "Management Reporting & MIS":
    "Delivers reliable MIS on time, checks figures before release and highlights the insight management needs, not just the data.",
  "Taxation & Withholding":
    "Applies correct tax and withholding rates, deposits and files within deadlines and maintains complete supporting records.",
  "Cost & Profitability Analysis":
    "Analyses cost drivers and unit economics by product, branch or channel and recommends practical cost or pricing actions.",
  "Payables, Payroll & Expense Control":
    "Processes payments and payroll accurately and on time, verifies approvals and supporting documents and prevents duplicate or unauthorised payments.",
  "Regulatory Returns to SBP":
    "Compiles returns accurately from source, meets submission deadlines and resolves regulator queries promptly.",
  "Fund Transfer Pricing Basics":
    "Understands how funds are priced internally and applies or explains FTP correctly in profitability discussions.",
  "Treasury Dealing & Money Market":
    "Executes deals within limits and mandate, obtains competitive rates, records deals immediately and never exceeds authority.",
  "Liquidity & Cash Flow Management":
    "Forecasts inflows and outflows, maintains required liquidity buffers and avoids last-minute funding scrambles.",
  "ALM & Gap Analysis":
    "Analyses maturity and rate gaps, explains balance-sheet sensitivity and supports ALCO with clear options.",
  "Investment Portfolio Management":
    "Manages the portfolio within policy limits, tracks yields and valuations and recommends timely rebalancing.",
  "Treasury Back Office Settlement":
    "Confirms, settles and reconciles deals independently of dealing, resolves breaks same day and maintains segregation of duties.",

  /* ------------------------------ Information Tech ----------------------------- */
  "Network & Infrastructure Support":
    "Keeps network and servers available, responds to outages quickly with structured troubleshooting and documents the fix.",
  "Database Administration (SQL)":
    "Maintains database performance, security and backups, writes safe queries and controls changes to production data.",
  "Core Banking Application Support":
    "Resolves core banking issues within SLA, understands the business process behind the ticket and escalates vendor issues with full detail.",
  "Digital Channels & API Support":
    "Monitors channel and API health, diagnoses failed transactions end to end and coordinates fixes with partners.",
  "Software Development Lifecycle":
    "Works to requirements, produces maintainable code, uses version control and testing properly and does not push untested changes.",
  "IT Service Management & Helpdesk":
    "Logs and prioritises tickets correctly, keeps users informed, resolves within SLA and closes tickets only after user confirmation.",
  "Backup, DR & System Availability":
    "Ensures backups run and are restorable, participates in DR tests and reports availability against targets honestly.",
  "Change & Release Management":
    "Raises changes with impact and rollback plans, obtains approval, implements in the change window and never makes undocumented production changes.",
  "Business Analysis & Requirement Writing":
    "Elicits real business needs, writes unambiguous and testable requirements and confirms them with stakeholders before build.",
  "QA & System Testing":
    "Prepares test cases from requirements, tests negative and edge scenarios, logs defects clearly and verifies fixes before sign-off.",
  "Digital Product Management":
    "Defines the product roadmap on user and business evidence, prioritises features and measures adoption after release.",
  "Mobile & Internet Banking Operations":
    "Manages day-to-day channel operations, monitors success rates and customer issues and drives fixes for recurring failures.",
  "UX Fundamentals":
    "Designs simple journeys for low-literacy and first-time users, tests with real users and removes unnecessary steps.",
  "Digital Adoption & Customer Education":
    "Trains clients and staff on digital services, tracks activation and usage and addresses the reasons people fall back to the counter.",

  /* -------------------------------- Human Resource ----------------------------- */
  "Talent Acquisition & Interviewing":
    "Sources suitable candidates, runs structured competency-based interviews, assesses objectively and closes vacancies within target time.",
  "Performance Management":
    "Sets measurable objectives, holds mid-year and year-end discussions, differentiates performance fairly and documents outcomes.",
  "HR Analytics & Headcount Reporting":
    "Maintains accurate headcount, turnover and cost data and turns it into insight for management decisions.",
  "Employee Relations & Labour Law":
    "Handles employee matters fairly and lawfully, keeps proper records and applies policy consistently across cases.",
  "Compensation & Benefits":
    "Administers pay, benefits and increments accurately and confidentially and explains the structure clearly to staff.",
  "HRMS Administration":
    "Keeps employee data accurate and current in the HRMS, processes movements promptly and protects data privacy.",
  "Employee Engagement & Culture":
    "Runs engagement activities and surveys, listens to feedback and follows through on committed actions.",
  "Grievance & Disciplinary Handling":
    "Investigates fairly, gives the employee a hearing, applies proportionate action and documents the process fully.",
  "Training Need Assessment":
    "Identifies real skill gaps from performance data and manager input and converts them into specific, prioritised training needs.",
  "Training Design & Facilitation":
    "Designs sessions with clear objectives and practical activities, facilitates engagingly and adapts to the audience's level.",
  "Kirkpatrick Evaluation of Training":
    "Measures reaction, learning, behaviour change and business impact and uses results to improve future programmes.",
  "E-learning Content Development":
    "Builds clear, interactive digital content, keeps it current and tracks completion and assessment results.",

  /* ----------------------------------- Legal ----------------------------------- */
  "Contract Drafting & Review":
    "Drafts and reviews contracts to protect the bank, flags risky clauses, negotiates changes and completes reviews within agreed time.",
  "Litigation Management":
    "Tracks every case, briefs counsel properly, prepares for hearings in advance and reports status and exposure accurately.",
  "Banking & Financial Law":
    "Applies banking, contract and security law correctly in advice and keeps current with amendments and case law.",
  "Regulatory Correspondence":
    "Prepares accurate, timely and well-supported responses to regulators and maintains a complete correspondence record.",

  /* --------------------------------- Marketing --------------------------------- */
  "Brand & Campaign Management":
    "Keeps brand usage consistent, plans campaigns to objectives and budget and measures results against targets.",
  "Digital Marketing & Social Media":
    "Runs and monitors digital campaigns, responds to online queries and complaints promptly and reports engagement and conversion.",
  "Market Research":
    "Designs sound research, collects unbiased data and turns findings into recommendations the business can act on.",
  "Content & Collateral Development":
    "Produces clear, compliant and error-free collateral in the right language and tone for the target client.",

  /* ----------------------------- Customer Experience --------------------------- */
  "Service Quality Standards":
    "Knows the service standards, monitors them through checks and mystery visits and corrects gaps with the concerned teams.",
  "Call Centre Handling Skills":
    "Handles calls courteously and efficiently, verifies the caller, resolves at first contact where possible and logs the interaction accurately.",
  "Root Cause Analysis of Complaints":
    "Looks past the individual complaint to the process cause, quantifies recurrence and drives a permanent fix.",
  "Customer Journey Mapping":
    "Maps the client's actual experience step by step, identifies pain points and proposes practical improvements.",

  /* ---------------------------------- Security --------------------------------- */
  "Physical Security & Premises Protection":
    "Maintains alertness on duty, checks entry and exit points, follows security drills and reports suspicious activity immediately.",
  "CCTV & Control Room Monitoring":
    "Monitors cameras attentively, ensures recording and retention work, and reports and preserves footage of incidents.",
  "Cash Movement & Escort Security":
    "Follows the approved route and timing discipline, keeps weapons and equipment ready and never discusses movements outside the team.",
  "Emergency & Evacuation Drills":
    "Knows the evacuation plan, guides staff and clients calmly and participates in drills seriously.",
  "Access Control & Visitor Management":
    "Verifies and records every visitor, controls entry to restricted areas and does not allow exceptions for familiar faces.",
  "Protocol & Front Desk Handling":
    "Receives visitors courteously, directs them correctly and maintains a professional presence at the entrance.",

  /* --------------------------------- Strategy ---------------------------------- */
  "Strategic Planning & Execution":
    "Translates strategy into concrete initiatives, owners and milestones, and reviews execution regularly rather than annually.",
  "Business Case Development":
    "Builds business cases with realistic costs, benefits and risks and tracks whether the promised benefits materialise.",
  "Project & Programme Management":
    "Plans scope, schedule and resources, manages risks and dependencies, reports status honestly and delivers on commitment dates.",
  "Performance Scorecards (BSC)":
    "Defines meaningful KPIs, keeps the scorecard current and uses it to drive action in review meetings.",

  /* ------------------------- Designation / leadership skills ------------------- */
  "Strategic Leadership":
    "Sets a clear direction for the function, aligns the team to bank priorities, makes tough calls and communicates the 'why' to staff.",
  "Budget Ownership & Cost Control":
    "Owns the function's budget, tracks spend against plan, challenges unnecessary cost and delivers within allocation.",
  "Succession Planning":
    "Identifies critical roles and successors, develops them deliberately and ensures no single point of dependency.",
  "Enterprise Governance":
    "Maintains sound governance, policy and committee discipline across the function and ensures decisions are documented and defensible.",
  "Board & Regulator Engagement":
    "Presents clearly and honestly to the board and regulators, answers questions with data and follows through on commitments made.",
  "People Management & Delegation":
    "Assigns work to the right people with clear outcomes and authority, follows up without micromanaging and develops capability in the team.",
  "Performance Coaching & Feedback":
    "Gives timely, specific and balanced feedback, agrees improvement actions and revisits them rather than waiting for appraisal season.",
  "Process Improvement":
    "Identifies waste, delay and rework in their process, tests improvements and embeds the new way of working.",
  "Team Supervision & Workload Planning":
    "Plans daily workload and coverage, monitors progress through the day and redistributes work when volumes shift.",
  "On-the-job Coaching":
    "Demonstrates the task, lets the person practise, observes and corrects in real time and checks learning afterwards.",
  "Shift & Roster Supervision":
    "Prepares fair rosters, ensures coverage at all times, manages leave and absence and hands over shifts properly.",
  "Quality Checking of Team Output":
    "Checks samples of team output against standard, gives corrective feedback and tracks error rates over time.",
  "Process Accuracy & Checklist Discipline":
    "Follows the process and checklist every time, self-checks work before submitting and keeps error and rework rates low.",
  "Customer Handling at Desk":
    "Attends to clients promptly and courteously, explains requirements clearly, avoids repeat visits and keeps the desk organised.",
  "Banking Fundamentals":
    "Understands basic banking products, terminology, documentation and the bank's structure and applies this in daily tasks.",
  "Learning Agility & Onboarding":
    "Learns new tasks quickly, asks questions, takes notes, applies feedback and becomes productive without repeated instruction.",
};

/** Observable behaviour for a skill, if one is defined in the catalogue. */
export function behaviourFor(name: string): string | null {
  return B[name.trim()] ?? null;
}

export const SKILL_BEHAVIOURS = B;
