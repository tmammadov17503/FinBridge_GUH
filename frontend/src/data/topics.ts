export type TopicId = "career" | "hardship" | "money";

/**
 * Each box is a one-tap question. The label is what the user reads; the prompt is what gets
 * sent to the agent, phrased as a person would ask it so the reply reads naturally.
 */
export interface TopicAction {
  label: string;
  prompt: string;
}

export interface Topic {
  id: TopicId;
  title: string;
  description: string;
  boxes: TopicAction[];
}

export const topics: Topic[] = [
  {
    id: "career",
    title: "Career help",
    description:
      "Get ready for interviews, improve your CV and find new kinds of work.",
    boxes: [
      {
        label: "Interview prep",
        prompt: "I've got an interview coming up. How should I prepare?",
      },
      {
        label: "CV builder",
        prompt:
          "How do I write a CV when most of my work has been shifts and short contracts?",
      },
      {
        label: "Career paths",
        prompt:
          "What kinds of work might give me a steadier income than zero-hours shifts?",
      },
      {
        label: "Training options",
        prompt: "What free or low-cost training could help me earn more?",
      },
    ],
  },
  {
    id: "hardship",
    title: "Future hardship",
    description:
      "Spot money worries early, like a big bill or a gap in your pay.",
    boxes: [
      {
        label: "Will I run short?",
        prompt: "Will I run short of money before my next payday?",
      },
      {
        label: "If my hours drop",
        prompt: "What happens to my balance if my income drops for a month?",
      },
      {
        label: "An unexpected bill",
        prompt:
          "What would an unexpected bill do to my balance over the next few weeks?",
      },
      {
        label: "Worst case",
        prompt:
          "What's the worst case if my hours drop and I get an unexpected cost at once?",
      },
    ],
  },
  {
    id: "money",
    title: "Money you have access to",
    description: "Find benefits, grants and help you might be able to get.",
    boxes: [
      {
        label: "Support I could get",
        prompt: "What support might I be able to apply for in my situation?",
      },
      {
        label: "Hardship funds",
        prompt: "Are there hardship funds or grants I could look into?",
      },
      {
        label: "Help with bills",
        prompt: "Could I get help with my bills or a discount on them?",
      },
      {
        label: "Talking to my bank",
        prompt:
          "How should I talk to my bank if I think a payment will bounce?",
      },
    ],
  },
];

export const headerCards = ["Next step", "Coming up", "Support for you"];
