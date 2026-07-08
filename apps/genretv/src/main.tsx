import "@mantine/core/styles.css";
import "./app.css";
import { Center, Loader, MantineProvider } from "@mantine/core";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { AuthProvider, useAuth } from "./auth/auth";
import { router } from "./router";
import { GenretvSyncProvider } from "./sync/provider";
import { theme } from "./theme";

if (import.meta.env.DEV || import.meta.env["VITE_E2E"] === "1") {
  (globalThis as { __pgxsinkitDebug?: boolean }).__pgxsinkitDebug = true;
}

function AppRoot() {
  const { loading, session } = useAuth();
  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  return (
    <GenretvSyncProvider session={session}>
      <RouterProvider router={router} />
    </GenretvSyncProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} defaultColorScheme="auto">
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  </MantineProvider>,
);
