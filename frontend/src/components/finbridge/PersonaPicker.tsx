import { useState } from "react";
import { cn } from "@/lib/utils";
import { DEMO_USERS, type CustomFinance, type DemoUserId } from "@/lib/finbridge/types";

export function PersonaPicker({
  value,
  onChange,
  onCustomProfile,
  disabled,
}: {
  value: DemoUserId;
  onChange: (next: DemoUserId) => void;
  onCustomProfile?: (profile: CustomFinance) => void;
  disabled?: boolean;
}) {
  const [form, setForm] = useState<CustomFinance>({
    balance: 200,
    nextIncomeDate: "",
    nextIncomeAmount: 500,
    monthlyBills: 400,
    weeklySpend: 30,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const isMeMode = value === "demo-me";

  function handleSelect(id: DemoUserId) {
    onChange(id);
    setFormError(null);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nextIncomeDate) {
      setFormError("Please enter your next income date.");
      return;
    }
    setFormError(null);
    onCustomProfile?.(form);
  }

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
              onClick={() => handleSelect(user.id)}
              className={cn(
                "min-h-11 border-b-2 py-1.5 text-left leading-snug md:border-b-0 md:border-l-2 md:pl-3",
                active
                  ? "border-primary text-foreground"
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

      {isMeMode && (
        <form
          onSubmit={handleFormSubmit}
          className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3"
        >
          <p className="text-xs text-muted-foreground mb-1">Your numbers (not stored)</p>

          <label className="flex flex-col gap-0.5 text-xs">
            Current balance (£)
            <input
              type="number"
              min={0}
              value={form.balance}
              onChange={(e) => setForm((f) => ({ ...f, balance: Number(e.target.value) }))}
              className="rounded border border-input bg-background px-2 py-1 text-sm"
            />
          </label>

          <label className="flex flex-col gap-0.5 text-xs">
            Next income date
            <input
              type="date"
              value={form.nextIncomeDate}
              onChange={(e) => setForm((f) => ({ ...f, nextIncomeDate: e.target.value }))}
              className="rounded border border-input bg-background px-2 py-1 text-sm"
            />
          </label>

          <label className="flex flex-col gap-0.5 text-xs">
            Expected income (£)
            <input
              type="number"
              min={0}
              value={form.nextIncomeAmount}
              onChange={(e) => setForm((f) => ({ ...f, nextIncomeAmount: Number(e.target.value) }))}
              className="rounded border border-input bg-background px-2 py-1 text-sm"
            />
          </label>

          <label className="flex flex-col gap-0.5 text-xs">
            Monthly bills & rent (£)
            <input
              type="number"
              min={0}
              value={form.monthlyBills}
              onChange={(e) => setForm((f) => ({ ...f, monthlyBills: Number(e.target.value) }))}
              className="rounded border border-input bg-background px-2 py-1 text-sm"
            />
          </label>

          <label className="flex flex-col gap-0.5 text-xs">
            Weekly essentials (£)
            <input
              type="number"
              min={0}
              value={form.weeklySpend}
              onChange={(e) => setForm((f) => ({ ...f, weeklySpend: Number(e.target.value) }))}
              className="rounded border border-input bg-background px-2 py-1 text-sm"
            />
          </label>

          {formError && (
            <p className="text-xs text-destructive">{formError}</p>
          )}

          <button
            type="submit"
            className="mt-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Use my numbers
          </button>
        </form>
      )}

      {!isMeMode && (
        <p className="mt-2 text-sm text-muted-foreground">
          Generated demo data, not a real person&apos;s bank account.
        </p>
      )}
    </fieldset>
  );
}
