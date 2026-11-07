export type TopicId = "career" | "hardship" | "money";

export interface Topic {
  id: TopicId;
  title: string;
  description: string;
  boxes: string[];
}

export const topics: Topic[] = [
  {
    id: "career",
    title: "Career help",
    description: "Get ready for interviews, improve your CV and find new kinds of work.",
    boxes: ["Interview prep", "CV builder", "Career paths", "Training options"],
  },
  {
    id: "hardship",
    title: "Future hardship",
    description: "Spot money worries early, like a big bill or a gap in your pay.",
    boxes: ["12-month outlook", "Bill alerts", "What if?", "Early warnings"],
  },
  {
    id: "money",
    title: "Money you have access to",
    description: "Find benefits, grants and help you might be able to get.",
    boxes: ["Benefits", "Grants", "Bill discounts", "Local help"],
  },
];

export const headerCards = ["Next step", "Coming up", "Support for you"];
