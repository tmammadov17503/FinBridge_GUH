import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/finbridge/ThemeToggle";

const NAV_LINKS = [
  { to: "/" as const, label: "Chat" },
  { to: "/lifeline" as const, label: "LIFELINE" },
  { to: "/money" as const, label: "Money Where It Is" },
  { to: "/communities" as const, label: "Communities" },
] as const;

export function NavBar() {
  return (
    <div className="bg-header-bar">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-5">
        <Link to="/" className="font-serif text-2xl font-bold text-header-bar-foreground hover:opacity-90 shrink-0">
          FinBridge
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-header-bar-foreground/80 transition-colors hover:bg-white/10 hover:text-header-bar-foreground"
              activeProps={{ className: "bg-white/20 text-header-bar-foreground" }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </div>
  );
}
