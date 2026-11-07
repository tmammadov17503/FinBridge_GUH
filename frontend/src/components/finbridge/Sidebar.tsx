import { cn } from "@/lib/utils";
import { topics, type TopicId } from "@/data/topics";

interface Props {
  active: TopicId | null;
  onSelect: (id: TopicId) => void;
}

export function Sidebar({ active, onSelect }: Props) {
  return (
    <nav
      aria-label="Topics"
      className="flex flex-row flex-wrap gap-2 self-start rounded-2xl border border-border bg-card p-3 md:flex-col"
    >
      {topics.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(t.id)}
            className={cn(
              "min-h-12 rounded-full px-5 py-3 text-left font-medium transition-colors",
              on ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent",
            )}
          >
            {t.title}
          </button>
        );
      })}
      <small className="hidden px-4 pt-2 text-xs text-muted-foreground md:block">
        Prototype. Guidance only, not regulated financial advice.
      </small>
    </nav>
  );
}
