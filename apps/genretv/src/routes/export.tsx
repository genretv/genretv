import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { useAuth } from "../auth/auth";
import { useCanonicalSchedule } from "../domain/live-canonical-schedule";
import { buildHtmlScheduleExport, downloadHtmlScheduleExport } from "../features/export/html-schedule-export";

export function ExportRoute() {
  const { session } = useAuth();
  const { canonicalLoading, canonicalSchedule, error, personalLoading, schedule } = useCanonicalSchedule();
  const date = localDateKey();

  const exportCanonicalHtml = () => {
    downloadHtmlScheduleExport(buildHtmlScheduleExport(canonicalSchedule), `genretv-canonical-${date}.html`);
  };
  const exportPersonalHtml = () => {
    downloadHtmlScheduleExport(buildHtmlScheduleExport(schedule), `genretv-personal-${date}.html`);
  };

  return (
    <Stack className="schedule-panel" gap="lg" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
      <div>
        <Title order={1}>Export</Title>
        <Text c="dimmed" size="sm">
          Download portable copies of the canonical schedule or your browser-local data.
        </Text>
      </div>

      {error != null && (
        <Alert color="red" title="Some local data could not be loaded">
          {error.message}
        </Alert>
      )}

      <ExportSection
        title="Canonical HTML"
        description="The complete canonical schedule as four unfiltered, original-style HTML tables."
      >
        <Button loading={canonicalLoading} disabled={error != null} onClick={exportCanonicalHtml}>
          Download canonical HTML
        </Button>
      </ExportSection>

      <ExportSection
        title="Canonical database"
        description="Only canonical base tables, without local sync tables, views, triggers, or functions."
      >
        <Button disabled>Database export unavailable in this build</Button>
      </ExportSection>

      {session == null ? (
        <Alert color="blue" title="Export your own data">
          <Group justify="space-between" align="center">
            <Text size="sm">Sign in to export your resolved Personal List and complete local database.</Text>
            <Button component={Link} to="/login" variant="default">
              Sign in
            </Button>
          </Group>
        </Alert>
      ) : (
        <>
          <ExportSection
            title="Personal HTML"
            description="Your complete resolved list, including the canonical baseline, edits, exclusions, additions, and imports."
          >
            <Button loading={personalLoading} disabled={error != null} onClick={exportPersonalHtml}>
              Download my list as HTML
            </Button>
          </ExportSection>

          <ExportSection
            title="Local database"
            description="The complete PGlite database mapped to this signed-in account, including local sync state."
          >
            <Button disabled>Database export unavailable in this build</Button>
          </ExportSection>
        </>
      )}
    </Stack>
  );
}

function ExportSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Stack className="export-section" gap="xs">
      <Title order={2} size="h3">
        {title}
      </Title>
      <Text c="dimmed" size="sm">
        {description}
      </Text>
      <Group>{children}</Group>
    </Stack>
  );
}

function localDateKey(): string {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}
