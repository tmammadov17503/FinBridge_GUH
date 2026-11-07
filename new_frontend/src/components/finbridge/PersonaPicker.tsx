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
    <fieldset disabled={disabled} className="disabled:opacity-60">
      <legend className="text-sm text-muted-foreground">Demo profile</legend>
      <div className="mt-1 flex flex-wrap gap-x-5 md:flex-col">
        {DEMO_USERS.map((user) => {
          const active = user.id === value;
          return (
            <button
              key={user.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(user.id)}
              className={cn(
                "min-h-11 border-b-2 py-1.5 text-left leading-snug md:border-b-0 md:border-l-2 md:pl-3",
                active
                  ? "border-link text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="block">{user.name}</span>
              <span className="block text-sm text-muted-foreground">
                {user.blurb}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Generated demo data, not a real person&apos;s bank account.
      </p>
    </fieldset>
  );
}
