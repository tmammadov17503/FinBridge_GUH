import { cn } from "@/lib/utils";
import { DEMO_USERS, type DemoUserId } from "@/lib/finbridge/types";

/**
 * Picks which demo persona the agent answers as.
 *
 * Every chat call needs a `userId` so the forecast engine knows whose numbers to use. Until
 * there are real accounts, that is one of the three generated personas in n8n's
 * `Load User Data` node — so the choice belongs on screen rather than hidden in a constant.
 */
export function PersonaPicker({
  value,
  onChange,
  disabled,
}: {
  value: DemoUserId;
  onChange: (next: DemoUserId) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      className="rounded-2xl border border-border bg-card p-3 disabled:opacity-60"
    >
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Demo profile
      </legend>
      <div className="flex flex-wrap gap-2 pt-1">
        {DEMO_USERS.map((user) => {
          const active = user.id === value;
          return (
            <button
              key={user.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(user.id)}
              className={cn(
                "min-h-12 flex-1 rounded-xl border px-3 py-2 text-left transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-accent",
              )}
            >
              <span className="block text-sm font-semibold">{user.name}</span>
              <span
                className={cn(
                  "block text-xs",
                  active
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {user.blurb}
              </span>
            </button>
          );
        })}
      </div>
      <p className="pt-2 text-xs text-muted-foreground">
        Generated demo data, not a real person&apos;s bank account.
      </p>
    </fieldset>
  );
}
