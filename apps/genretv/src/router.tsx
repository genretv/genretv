import { createHashHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { ExportRoute } from "./routes/export";
import { HomeRoute } from "./routes/home";
import { LoginRoute, RecoverRoute, ResetPasswordRoute, SignUpRoute } from "./routes/login";
import { ManageRoute } from "./routes/manage";
import { ManageEpisodeRoute } from "./routes/manage-episode";
import { ManageHiddenRoute } from "./routes/manage-hidden";
import { ManageSeasonRoute } from "./routes/manage-season";
import { ManageShowRoute } from "./routes/manage-show";
import { ProfileRoute } from "./routes/profile";
import { PublicProfileRoute } from "./routes/public-profile";
import { PublishedRoute } from "./routes/published";
import { PublishedListRoute } from "./routes/published-list";
import { PublishingRoute } from "./routes/publishing";
import { RootLayout } from "./routes/root";

const rootRoute = createRootRoute({ component: RootLayout });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeRoute,
});

const exportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/export",
  component: ExportRoute,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginRoute,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignUpRoute,
});

const recoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recover",
  component: RecoverRoute,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordRoute,
});

const manageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manage",
  component: ManageRoute,
});

const manageHiddenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manage/hidden",
  component: ManageHiddenRoute,
});

const manageShowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manage/show/$showId",
  component: ManageShowRoute,
});

const manageSeasonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manage/show/$showId/season/$seasonId",
  component: ManageSeasonRoute,
});

const manageEpisodeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manage/show/$showId/season/$seasonId/episode/$episodeId",
  component: ManageEpisodeRoute,
});

const publishingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/publishing",
  component: PublishingRoute,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfileRoute,
});

const publicProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$slug",
  component: PublicProfileRoute,
});

const publishedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/published",
  component: PublishedRoute,
});

const publishedListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/published/$slug",
  component: PublishedListRoute,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  exportRoute,
  loginRoute,
  signUpRoute,
  recoverRoute,
  resetPasswordRoute,
  manageRoute,
  manageHiddenRoute,
  manageShowRoute,
  manageSeasonRoute,
  manageEpisodeRoute,
  publishingRoute,
  profileRoute,
  publicProfileRoute,
  publishedRoute,
  publishedListRoute,
]);

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
