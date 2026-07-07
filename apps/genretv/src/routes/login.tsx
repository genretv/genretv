import { Alert, Button, Center, Group, PasswordInput, SegmentedControl, Stack, Text, TextInput, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAuth } from "../auth/auth";

type AuthMode = "sign-in" | "sign-up" | "recover";

export function LoginRoute() {
  const { session, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (session) void navigate({ to: "/" });
  }, [session, navigate]);

  const submitAuth = async () => {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "sign-in") {
        await signIn(email, password);
      } else if (mode === "sign-up") {
        await signUp(email, password);
        setNotice("Check your email to confirm the account if confirmation is enabled.");
      } else {
        await resetPassword(email);
        setNotice("Password recovery email sent.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <Center mih="70vh">
      <form
        style={{ width: "100%", maxWidth: 430 }}
        onSubmit={(event) => {
          event.preventDefault();
          void submitAuth();
        }}
      >
        <Stack gap="md">
          <div>
            <Title order={2}>Your GenreTV list</Title>
            <Text size="sm" c="dimmed">
              Sign in to edit an overlay, apply to publish, or send changes for the canonical list.
            </Text>
          </div>

          <SegmentedControl
            value={mode}
            onChange={(value) => {
              setMode(value as AuthMode);
              setError(null);
              setNotice(null);
            }}
            data={[
              { label: "Sign in", value: "sign-in" },
              { label: "Sign up", value: "sign-up" },
              { label: "Recover", value: "recover" },
            ]}
          />

          {error != null && (
            <Alert color="red" title="Authentication failed" variant="light">
              {error}
            </Alert>
          )}
          {notice != null && (
            <Alert color="green" title="Done" variant="light">
              {notice}
            </Alert>
          )}

          <TextInput
            label="Email"
            type="email"
            value={email}
            autoComplete="email"
            required
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          {mode !== "recover" && (
            <PasswordInput
              label="Password"
              value={password}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          )}
          <Group justify="space-between">
            <Button component="a" href="/" variant="subtle">
              Back to schedule
            </Button>
            <Button type="submit" loading={pending}>
              {mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send recovery email"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Center>
  );
}
