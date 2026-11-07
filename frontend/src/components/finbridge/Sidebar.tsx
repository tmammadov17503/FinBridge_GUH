import { cn } from "@/lib/utils";
import { topics, type TopicId } from "@/data/topics";

interface Props {
  active: TopicId | null;
  onSelect: (id: TopicId | null) => void;
}

const items: { id: TopicId | null; title: string }[] = [
  { id: null, title: "Start here" },
  ...topics.map((t) => ({ id: t.id, title: t.title })),
];

export function Sidebar({ active, onSelect }: Props) {
  return (
    <nav
      aria-label="Topics"
      className="flex flex-row flex-wrap gap-x-5 border-b border-border md:flex-col md:border-b-0"
    >
      {items.map((item) => {
        const on = active === item.id;
        return (
          <button
            key={item.title}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(item.id)}
            className={cn(
              "min-h-11 border-b-2 py-2 text-left leading-snug md:border-b-0 md:border-l-2 md:pl-3",
              on
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.title}
          </button>
        );
      })}
    </nav>
  );
}
