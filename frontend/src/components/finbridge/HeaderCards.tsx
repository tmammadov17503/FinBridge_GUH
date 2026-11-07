import { headerCards } from "@/data/topics";
import { Placeholder } from "./Placeholder";

export function HeaderCards() {
  return (
    <header className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {headerCards.map((title, i) => (
        <div key={title} className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 text-base font-bold">{title}</h2>
          <Placeholder label={`Card ${i + 1}`} />
        </div>
      ))}
    </header>
  );
}
