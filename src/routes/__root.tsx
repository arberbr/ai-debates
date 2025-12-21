import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <nav className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-6">
            <Link
              to="/"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              activeProps={{
                className: "text-foreground font-semibold"
              }}
            >
              Home
            </Link>
            <Link
              to="/debates"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              activeProps={{
                className: "text-foreground font-semibold"
              }}
            >
              Debates
            </Link>
            <Link
              to="/leaderboard"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              activeProps={{
                className: "text-foreground font-semibold"
              }}
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </nav>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})
