import { Link } from "@tanstack/react-router";

export const Navbar = () => {
  return (
    <nav className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-6">
          <Link
            to="/"
            className="text-lg px-4 py-3 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
            activeProps={{
              className: "text-foreground font-semibold",
            }}
            aria-label="AI Debates - Home"
          >
            AI Debates
          </Link>
          <Link
            to="/about"
            className="text-lg px-4 py-3 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
            activeProps={{
              className: "text-foreground font-semibold",
            }}
            aria-label="About AI Debates"
          >
            About
          </Link>
          <Link
            to="/debates"
            className="text-lg px-4 py-3 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
            activeProps={{
              className: "text-foreground font-semibold",
            }}
            aria-label="View all debates"
          >
            Debates
          </Link>
          <Link
            to="/leaderboard"
            className="text-lg px-4 py-3 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
            activeProps={{
              className: "text-foreground font-semibold",
            }}
            aria-label="View leaderboard"
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </nav>
  );
};
