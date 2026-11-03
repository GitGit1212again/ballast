// Static DBT reference tables. Plain data, no logic.

export const DEFAULT_EMOTIONS = ["Sadness", "Anger", "Fear", "Shame", "Loneliness", "Suspicious", "Joy"];

export const DEFAULT_URGES = [
  "Hurt myself",
  "Give up / quit",
  "Lash out",
  "Send an impulsive message",
  "Push someone away",
  "Use (substances, food, spending)",
];

export const SKILL_GROUPS = [
  { name: "Mindfulness", skills: ["Observe & describe", "Wise mind", "Non-judgmental stance", "One thing at a time"] },
  { name: "Distress tolerance", skills: ["STOP", "TIPP", "Self-soothe", "Distract (ACCEPTS)", "Pros & cons", "Radical acceptance", "Urge surfing"] },
  { name: "Emotion regulation", skills: ["Check the facts", "Opposite action", "Problem solving", "PLEASE (body care)", "Accumulate positives"] },
  { name: "Interpersonal", skills: ["DEAR MAN", "GIVE", "FAST", "Asked for help", "Said no"] },
];

export const HOLD_OPTIONS = [
  { label: "20 min", ms: 20 * 60e3 },
  { label: "1 hour", ms: 60 * 60e3 },
  { label: "3 hours", ms: 3 * 60 * 60e3 },
  { label: "Overnight (12 h)", ms: 12 * 60 * 60e3 },
  { label: "24 hours", ms: 24 * 60 * 60e3 },
];

export const FACT_PROMPTS = [
  { key: "know", q: "What do I know for certain happened? (Only things a camera would have recorded.)" },
  { key: "assume", q: "What am I assuming about what they meant or feel?" },
  { key: "other", q: "What is one other explanation that is at least possible?" },
  { key: "calm", q: "If I were calm right now, what would I say instead, if anything?" },
  { key: "cost", q: "If I send this as written, what happens in an hour? Tomorrow?" },
];

// Emotion -> does-it-fit-the-facts question -> opposite action -> when-justified action.
export const EMOTION_GUIDE = {
  Fear: {
    fits: "Is there a real threat to my life, health, or wellbeing, or that of someone I care about, right now?",
    opposite: [
      "Approach the thing you are afraid of, in small steps, and keep doing it.",
      "Do what you are avoiding. Stand tall, speak clearly, look at people.",
      "Do not ask for reassurance more than once.",
    ],
    justified: "Reduce the threat: leave, get help, make a plan, take one concrete protective action.",
  },
  Anger: {
    fits: "Is an important goal actually being blocked, or am I being attacked, insulted, or hurt right now?",
    opposite: [
      "Gently avoid or step away for a set time (say how long).",
      "Do something a little kind for the person, or at least neutral.",
      "Imagine understanding their side. Relax the jaw, hands, and shoulders. Half-smile.",
      "Do not rehearse the argument in your head.",
    ],
    justified: "Act on the goal, not the person: say what you need clearly (DEAR MAN), set a limit, or leave.",
  },
  Sadness: {
    fits: "Have I actually lost something or someone, or are things really not the way I need them to be?",
    opposite: [
      "Get active: move, shower, go outside, do one small thing you can finish.",
      "Do something that gives a sense of being capable.",
      "Approach rather than avoid people and tasks. Sit and stand upright.",
    ],
    justified: "Grieve on purpose: feel it, name it, let someone know, and still keep the day's basics going.",
  },
  Shame: {
    fits: "If people I care about knew this, would they genuinely reject me for it, and would that be a fair response?",
    opposite: [
      "Do not hide. Tell someone safe what happened.",
      "Keep doing the thing (if it is not actually wrong), head up, voice steady.",
      "Repair if there is something to repair, then stop apologising.",
    ],
    justified: "Own it, make a repair, accept the consequence, and then let it be over.",
  },
  Guilt: {
    fits: "Did I actually break one of my own values, or only someone else's rule for me?",
    opposite: ["Keep doing what you did. No apology, no over-explaining.", "Stand by the choice out loud."],
    justified: "Apologise once, repair what you can, commit to a different action next time, then drop it.",
  },
  Loneliness: {
    fits: "Am I actually cut off from people, or am I feeling alone while people are in fact still here?",
    opposite: [
      "Reach out to one safe person with a normal, low-intensity message (not the big one: put that in the Drawer).",
      "Be around people without needing anything from them: a shop, a class, a call about nothing.",
      "Do a thing you enjoy alone, on purpose, not as a punishment.",
    ],
    justified: "Build contact deliberately: schedule one call, one invite, one group thing this week.",
  },
  Jealousy: {
    fits: "Is this relationship really in danger of being damaged or taken, based on things that happened?",
    opposite: [
      "Stop checking, spying, testing, or interrogating.",
      "Let go of controlling what the other person does.",
      "Relax the body. Do something for yourself.",
    ],
    justified: "Say the concern once, plainly, and ask for what you need (DEAR MAN). Protect what is yours to protect.",
  },
  Envy: {
    fits: "Does the other person really have something I need (not just want), and is it within my reach?",
    opposite: ["Count what you do have, specifically.", "Stop exaggerating what they have.", "Stop the comparing behaviour."],
    justified: "Work toward getting it, or improve your own situation in one concrete way.",
  },
  Love: {
    fits: "Does this person actually enhance my life and treat me well, and is a relationship possible and healthy?",
    opposite: [
      "Avoid contact for now. Distract. Remind yourself of the real reasons this does not work.",
      "Stop looking at their photos, messages, and pages.",
    ],
    justified: "Express it in a measured way and act in ways that build the relationship over time.",
  },
};

export const DEAR_MAN = [
  { key: "describe", label: "Describe", hint: "Just the facts of the situation. No judgements." },
  { key: "express", label: "Express", hint: "How you feel about it, using 'I feel'." },
  { key: "assert", label: "Assert", hint: "Ask clearly for what you want, or say no clearly." },
  { key: "reinforce", label: "Reinforce", hint: "What is in it for them if they do this." },
  { key: "mindful", label: "(stay) Mindful", hint: "Your one-line broken-record sentence if they derail." },
  { key: "appear", label: "Appear confident", hint: "Reminder to yourself: posture, voice, eye contact." },
  { key: "negotiate", label: "Negotiate", hint: "What you can offer or accept instead." },
];

export const GIVE_FAST = {
  GIVE: ["Gentle: no attacks, threats, or judging", "Interested: listen, do not interrupt", "Validate: acknowledge their side", "Easy manner: a little lightness"],
  FAST: ["Fair to yourself and them", "no over-Apologising", "Stick to your values", "Truthful: no exaggerating or acting helpless"],
};

export const LINK_KINDS = ["event", "thought", "feeling", "body", "action"];

export const DEFAULT_SETTINGS = {
  soothe: ["Hot shower or cold face wash", "Weighted blanket", "One song on repeat", "Tea, slowly", "Pet or soft thing"],
  distract: ["Walk around the block", "Count backwards from 300 by 7", "Sort or clean one drawer", "Video with no plot", "Puzzle or game for 15 min"],
  plan: "",
  contacts: [],
  hotlines: [
    { name: "988 Suicide & Crisis Lifeline (US)", number: "988", note: "Call or text, 24/7" },
    { name: "Crisis Text Line (US)", number: "Text HOME to 741741", note: "" },
  ],
  emergency: "If you are in immediate danger, call your local emergency number.",
};
