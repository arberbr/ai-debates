import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Navbar } from "@/components/layout/Navbar";
import { Toast } from "@/components/ui/toast";

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <Navbar />
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
      <Toast />
    </ErrorBoundary>
  ),
});
