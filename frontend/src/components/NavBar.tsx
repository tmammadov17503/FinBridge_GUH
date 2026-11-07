import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/finbridge/ThemeToggle";

const NAV_LINKS = [
  { to: "/" as const, label: "Chat" },
  { to: "/lifeline" as const, label: "LifeLine" },
  { to: "/money" as const, label: "Money Where It Is" },
  { to: "/communities" as const, label: "Communities" },
] as const;

export function NavBar() {
  return (
    <header className="mx-auto w-full max-w-[1000px] px-5 md:px-8">
      <div className="flex flex-wrap items-center gap-x-8 border-b border-border">
        <Link to="/" className="py-3 font-serif text-xl text-heading">
          FinBridge
        </Link>
        <div className="ml-auto md:order-last">
          <ThemeToggle />
        </div>
        <nav
          aria-label="Main"
          className="flex w-full gap-x-5 overflow-x-auto md:w-auto"
        >
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="flex min-h-11 items-center whitespace-nowrap border-b-2 border-transparent text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: "border-primary! text-foreground!" }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
