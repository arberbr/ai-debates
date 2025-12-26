import { createRouter, RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import "./index.css";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Add dark class to document for dark mode
document.documentElement.classList.add("dark");

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Export router for use outside of React components (e.g., ErrorBoundary)
export { router };

// Add global unhandled promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  // Optionally show user-friendly error notification
  // The error will be handled by ErrorBoundary or other error handling mechanisms
});

// Render the app
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}
