import { createHashHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { HomeRoute } from "./routes/home";
import { LoginRoute } from "./routes/login";
import { RootLayout } from "./routes/root";

const rootRoute = createRootRoute({ component: RootLayout });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeRoute,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginRoute,
});

const routeTree = rootRoute.addChildren([homeRoute, loginRoute]);

const hashRouting = import.meta.env["VITE_GENRETV_HASH_ROUTING"] === "1";

export const router = createRouter({
  routeTree,
  ...(hashRouting ? { history: createHashHistory() } : {}),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
