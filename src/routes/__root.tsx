import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Navbar } from "@/components/layout/Navbar";

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <Navbar />
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
      <Toaster position="bottom-right" />
    </ErrorBoundary>
  ),
});
