import { Alert, Anchor, Button, Center, Group, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAuth } from "../auth/auth";

type AuthMode = "sign-in" | "sign-up" | "recover" | "update-password";

const copy: Record<AuthMode, { title: string; body: string; submit: string }> = {
  "sign-in": {
    title: "Your GenreTV list",
    body: "Sign in to edit an overlay, apply to publish, or send changes for the canonical list.",
    submit: "Sign in",
  },
  "sign-up": {
    title: "Create your GenreTV account",
    body: "New accounts start with the canonical list and an empty personal overlay.",
    submit: "Create account",
  },
  recover: {
    title: "Recover your password",
    body: "Send a recovery link to the email on your account.",
    submit: "Send recovery email",
  },
  "update-password": {
    title: "Set a new password",
    body: "Choose a new password for the account opened by your recovery link.",
    submit: "Update password",
  },
};

export function LoginRoute() {
  return <AuthRoute initialMode="sign-in" />;
}

export function SignUpRoute() {
  return <AuthRoute initialMode="sign-up" />;
}

export function RecoverRoute() {
  return <AuthRoute initialMode="recover" />;
}

export function ResetPasswordRoute() {
  return <AuthRoute initialMode="update-password" />;
}

function AuthRoute({ initialMode }: { initialMode: AuthMode }) {
  const { session, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const needsEmail = mode !== "update-password";
  const needsPassword = mode !== "recover";

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setNotice(null);
  }, [initialMode]);

  useEffect(() => {
    if (session && mode !== "update-password") void navigate({ to: "/" });
  }, [session, mode, navigate]);

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
      } else if (mode === "recover") {
        await resetPassword(email);
        setNotice("Password recovery email sent.");
      } else {
        await updatePassword(password);
        setNotice("Password updated.");
        void navigate({ to: "/" });
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
        className="schedule-panel auth-panel"
        style={{ width: "100%", maxWidth: 430 }}
        onSubmit={(event) => {
          event.preventDefault();
          void submitAuth();
        }}
      >
        <Stack gap="md">
          <div>
            <Title order={2}>{copy[mode].title}</Title>
            <Text size="sm" c="dimmed">
              {copy[mode].body}
            </Text>
          </div>

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

          {mode === "update-password" && session == null && (
            <Alert color="yellow" title="Recovery session missing" variant="light">
              Open the recovery link from your email before setting a new password.
            </Alert>
          )}

          {needsEmail && (
            <TextInput
              label="Email"
              type="email"
              value={email}
              autoComplete="email"
              required
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
          )}
          {needsPassword && (
            <PasswordInput
              label={mode === "update-password" ? "New password" : "Password"}
              value={password}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          )}
          <Group gap="sm">
            {mode !== "sign-in" && (
              <Anchor href="/login" size="sm">
                Sign in
              </Anchor>
            )}
            {mode !== "sign-up" && (
              <Anchor href="/signup" size="sm">
                Create account
              </Anchor>
            )}
            {mode !== "recover" && (
              <Anchor href="/recover" size="sm">
                Forgot password?
              </Anchor>
            )}
          </Group>
          <Group justify="space-between">
            <Button component="a" href="/" variant="subtle">
              Back to schedule
            </Button>
            <Button type="submit" loading={pending} disabled={mode === "update-password" && session == null}>
              {copy[mode].submit}
            </Button>
          </Group>
        </Stack>
      </form>
    </Center>
  );
}
