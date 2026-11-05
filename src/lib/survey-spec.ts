export type SurveyQuestionType = "scale5" | "choice" | "multi" | "long" | "nps" | "stars";

export type SurveyQuestion = {
  id: string;
  num: number;
  text: string;
  type: SurveyQuestionType;
  options?: string[];
  scaleLabels?: string[];
  maxSelect?: number;
  section: string;
  optional?: boolean;
};

export const TENURE_OPTIONS = [
  "Less than 6 months",
  "6 months–1 year",
  "1–3 years",
  "3–5 years",
  "More than 5 years",
];

export const AGREE_LABELS = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree",
];

export const SURVEY_SECTIONS: { key: string; title: string; note?: string }[] = [
  { key: "s2", title: "Section 2 — Awareness & Participation" },
  {
    key: "s3",
    title: "Section 3 — Relevance & Quality of Learning",
    note: "1 = Strongly Disagree · 2 = Disagree · 3 = Neutral · 4 = Agree · 5 = Strongly Agree",
  },
  { key: "s4", title: "Section 4 — Learning & Knowledge Gain" },
  { key: "s5", title: "Section 5 — Application & Behavioural Change" },
  { key: "s6", title: "Section 6 — Business Impact" },
  { key: "s7", title: "Section 7 — Managerial Support" },
  { key: "s8", title: "Section 8 — L&D Service & Experience" },
  { key: "s9", title: "Section 9 — Digital Learning & Future Learning" },
  { key: "s10", title: "Section 10 — Overall Effectiveness" },
  { key: "s11", title: "Section 11 — Open Feedback" },
];

const agree = (id: string, num: number, text: string, section: string): SurveyQuestion => ({
  id,
  num,
  text,
  type: "scale5",
  scaleLabels: AGREE_LABELS,
  section,
});

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  // Section 2
  {
    id: "q6_awareness",
    num: 6,
    text: "How aware are you of the learning and development opportunities offered by ABHI Microfinance Bank?",
    type: "scale5",
    scaleLabels: [
      "Not aware at all",
      "Slightly aware",
      "Moderately aware",
      "Very aware",
      "Extremely aware",
    ],
    section: "s2",
  },
  {
    id: "q7_participation_count",
    num: 7,
    text: "During the last 12 months, how many L&D initiatives have you participated in?",
    type: "choice",
    options: ["None", "1–2", "3–5", "6–10", "More than 10"],
    section: "s2",
  },
  {
    id: "q8_initiatives",
    num: 8,
    text: "Which L&D initiatives have you participated in?",
    type: "multi",
    options: [
      "Classroom Training",
      "Virtual Training",
      "On-the-job learning",
      "Induction / Onboarding",
      "Leadership Development",
      "Technical / Functional Training",
      "Soft Skills Training",
      "Compliance / Regulatory Training",
      "Digital / eLearning",
      "Coaching / Mentoring",
      "Workshops / Seminars",
      "Other",
    ],
    section: "s2",
  },
  {
    id: "q9_access",
    num: 9,
    text: "How easy is it to access information about available training and learning opportunities?",
    type: "scale5",
    scaleLabels: ["Very difficult", "Difficult", "Neutral", "Easy", "Very easy"],
    section: "s2",
  },

  // Section 3
  agree("q10", 10, "The training programs offered are relevant to my job responsibilities.", "s3"),
  agree("q11", 11, "The training topics address the actual challenges I face at work.", "s3"),
  agree("q12", 12, "Training content is practical rather than purely theoretical.", "s3"),
  agree("q13", 13, "The trainers/facilitators demonstrate strong subject knowledge.", "s3"),
  agree("q14", 14, "The training methods used keep participants engaged.", "s3"),
  agree("q15", 15, "Learning materials/resources provided during training are useful.", "s3"),
  agree("q16", 16, "The duration of training is appropriate for the subject.", "s3"),
  agree("q17", 17, "The overall quality of L&D programs has improved over the past year.", "s3"),

  // Section 4
  agree(
    "q18",
    18,
    "After participating in L&D initiatives, I have a better understanding of the relevant subject matter.",
    "s4",
  ),
  agree(
    "q19",
    19,
    "L&D initiatives have helped me develop new skills or improve existing skills.",
    "s4",
  ),
  agree("q20", 20, "I can confidently apply what I learned in my job.", "s4"),
  agree("q21", 21, "Training has improved my ability to solve work-related problems.", "s4"),
  agree(
    "q22",
    22,
    "Training has increased my confidence in performing my responsibilities.",
    "s4",
  ),
  agree(
    "q23",
    23,
    "I retain and use the knowledge gained from training after the program ends.",
    "s4",
  ),

  // Section 5
  {
    id: "q24_apply_frequency",
    num: 24,
    text: "How frequently do you apply what you learn from training in your day-to-day work?",
    type: "choice",
    options: ["Never", "Rarely", "Sometimes", "Frequently", "Very frequently"],
    section: "s5",
  },
  agree("q25", 25, "L&D initiatives have positively influenced the way I perform my job.", "s5"),
  agree("q26", 26, "Training has helped me improve my productivity/efficiency.", "s5"),
  agree(
    "q27",
    27,
    "Training has helped me reduce mistakes or improve the quality of my work.",
    "s5",
  ),
  agree("q28", 28, "Training has helped me communicate and collaborate more effectively.", "s5"),
  agree("q29", 29, "Training has encouraged me to adopt new ways of working.", "s5"),
  agree(
    "q30",
    30,
    "My manager/supervisor encourages me to apply what I learn from training.",
    "s5",
  ),

  // Section 6
  agree(
    "q31",
    31,
    "L&D initiatives contribute to achieving ABHI Microfinance Bank's business objectives.",
    "s6",
  ),
  agree("q32", 32, "Training programs have helped improve employee performance.", "s6"),
  agree("q33", 33, "L&D initiatives support better customer service.", "s6"),
  agree("q34", 34, "L&D initiatives contribute to improved operational efficiency.", "s6"),
  agree(
    "q35",
    35,
    "L&D initiatives help employees adapt to changes in systems, processes, products, and technology.",
    "s6",
  ),
  agree("q36", 36, "Overall, L&D initiatives provide meaningful value to the Bank.", "s6"),
  {
    id: "q37_biggest_impact",
    num: 37,
    text: "In your opinion, what is the biggest impact of L&D initiatives on your work?",
    type: "multi",
    options: [
      "Improved technical knowledge",
      "Improved productivity",
      "Better customer handling",
      "Better decision-making",
      "Improved communication",
      "Improved leadership capability",
      "Better compliance awareness",
      "Improved use of technology/digital tools",
      "Improved confidence",
      "Better problem-solving",
      "No significant impact yet",
      "Other",
    ],
    section: "s6",
  },

  // Section 7
  agree("q38", 38, "My manager discusses my learning and development needs with me.", "s7"),
  agree("q39", 39, "My manager supports me in attending relevant learning programs.", "s7"),
  agree("q40", 40, "My manager gives me opportunities to apply newly acquired skills.", "s7"),
  agree("q41", 41, "My manager provides feedback on how I can improve my performance.", "s7"),
  agree("q42", 42, "After training, I receive sufficient support to apply what I learned.", "s7"),

  // Section 8
  agree("q43", 43, "L&D communicates training information in a timely manner.", "s8"),
  agree("q44", 44, "The nomination/registration process is convenient.", "s8"),
  agree("q45", 45, "Training schedules are communicated clearly.", "s8"),
  agree("q46", 46, "L&D responds effectively to employee learning needs and queries.", "s8"),
  agree(
    "q47",
    47,
    "L&D initiatives are aligned with the changing needs of employees and the Bank.",
    "s8",
  ),
  agree(
    "q48",
    48,
    "Overall, I am satisfied with the learning opportunities provided by ABHI Microfinance Bank.",
    "s8",
  ),

  // Section 9
  {
    id: "q49_digital_interest",
    num: 49,
    text: "How interested are you in digital/self-paced learning?",
    type: "scale5",
    scaleLabels: [
      "Not interested",
      "Slightly interested",
      "Moderately interested",
      "Very interested",
      "Extremely interested",
    ],
    section: "s9",
  },
  {
    id: "q50_preferred_formats",
    num: 50,
    text: "Which learning formats would you prefer in the future? (Select up to 3)",
    type: "multi",
    maxSelect: 3,
    options: [
      "Classroom Training",
      "Virtual Instructor-Led Training",
      "Self-paced eLearning",
      "Short learning videos",
      "Microlearning",
      "Webinars",
      "Workshops",
      "Coaching",
      "Mentoring",
      "On-the-job learning",
      "Job aids / quick reference guides",
      "AI-based learning",
      "Other",
    ],
    section: "s9",
  },
  {
    id: "q51_focus_areas",
    num: 51,
    text: "Which areas would you most like ABHI L&D to focus on? (Select up to 5)",
    type: "multi",
    maxSelect: 5,
    options: [
      "Leadership",
      "People Management",
      "Communication",
      "Customer Service",
      "Sales",
      "Credit / Lending",
      "Risk Management",
      "Compliance / AML-CFT",
      "Islamic Finance",
      "Digital Banking",
      "AI & Technology",
      "Data Analytics",
      "Financial Literacy",
      "Productivity & Time Management",
      "Problem Solving & Decision Making",
      "Business Acumen",
      "Presentation Skills",
      "Emotional Intelligence",
      "Change Management",
      "Other",
    ],
    section: "s9",
  },

  // Section 10
  {
    id: "q52_overall",
    num: 52,
    text: "Overall, how would you rate the effectiveness of ABHI Microfinance Bank's L&D initiatives?",
    type: "stars",
    scaleLabels: ["Very Poor", "Poor", "Average", "Good", "Excellent"],
    section: "s10",
  },
  {
    id: "q53_nps",
    num: 53,
    text: "How likely are you to recommend ABHI's learning programs to a colleague? (0 = Not at all likely, 10 = Extremely likely)",
    type: "nps",
    section: "s10",
  },

  // Section 11
  {
    id: "q54_most_valuable",
    num: 54,
    text: "Which L&D initiative has been most valuable to you, and why?",
    type: "long",
    section: "s11",
    optional: true,
  },
  {
    id: "q55_biggest_gap",
    num: 55,
    text: "What is the biggest gap you currently see in ABHI's learning and development initiatives?",
    type: "long",
    section: "s11",
    optional: true,
  },
  {
    id: "q56_start",
    num: 56,
    text: "What should L&D start doing?",
    type: "long",
    section: "s11",
    optional: true,
  },
  {
    id: "q57_stop",
    num: 57,
    text: "What should L&D stop doing?",
    type: "long",
    section: "s11",
    optional: true,
  },
  {
    id: "q58_continue",
    num: 58,
    text: "What should L&D continue doing?",
    type: "long",
    section: "s11",
    optional: true,
  },
  {
    id: "q59_new_initiative",
    num: 59,
    text: "If you could introduce one new learning initiative at ABHI, what would it be?",
    type: "long",
    section: "s11",
    optional: true,
  },
  {
    id: "q60_comments",
    num: 60,
    text: "Any additional suggestions or comments for the L&D team?",
    type: "long",
    section: "s11",
    optional: true,
  },
];

export const RATING_QUESTIONS = SURVEY_QUESTIONS.filter(
  (q) => q.type === "scale5" || q.type === "stars",
);
export const CHOICE_QUESTIONS = SURVEY_QUESTIONS.filter(
  (q) => q.type === "choice" || q.type === "multi",
);
export const TEXT_QUESTIONS = SURVEY_QUESTIONS.filter((q) => q.type === "long");

export const SURVEY_SECTION_TITLES = Object.fromEntries(
  SURVEY_SECTIONS.map((s) => [s.key, s.title]),
);
