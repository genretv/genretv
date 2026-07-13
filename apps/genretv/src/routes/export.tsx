import { createCanonicalExportWorkerClient, type CanonicalExportSyncClient } from "@genretv/offline-data/client";
import { useSyncClient } from "@genretv/offline-data/hooks";
import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "../auth/auth";
import { useCanonicalSchedule } from "../domain/live-canonical-schedule";
import { downloadFile } from "../features/export/file-download";
import { buildHtmlScheduleExport, downloadHtmlScheduleExport } from "../features/export/html-schedule-export";
import { getCanonicalExportWorkerPort } from "../sync/worker-port";

export function ExportRoute() {
  const { session } = useAuth();
  const syncClient = useSyncClient();
  const { canonicalEmpty, canonicalLoading, canonicalSchedule, error, personalLoading, schedule } =
    useCanonicalSchedule();
  const [canonicalDatabaseLoading, setCanonicalDatabaseLoading] = useState(false);
  const [localDatabaseLoading, setLocalDatabaseLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState<Error | null>(null);
  const date = localDateKey();

  const exportCanonicalHtml = () => {
    downloadHtmlScheduleExport(buildHtmlScheduleExport(canonicalSchedule), `genretv-canonical-${date}.html`);
  };
  const exportPersonalHtml = () => {
    downloadHtmlScheduleExport(buildHtmlScheduleExport(schedule), `genretv-personal-${date}.html`);
  };
  const exportCanonicalDatabase = async () => {
    setCanonicalDatabaseLoading(true);
    setDatabaseError(null);
    let exportClient: CanonicalExportSyncClient | null = null;
    try {
      exportClient = await createCanonicalExportWorkerClient(getCanonicalExportWorkerPort);
      await exportClient.ready;
      const { file } = await exportClient.exportData({ fileName: `genretv-canonical-${date}.sql` });
      downloadFile(file);
    } catch (cause) {
      setDatabaseError(toError(cause));
    } finally {
      await exportClient?.stop();
      setCanonicalDatabaseLoading(false);
    }
  };
  const exportLocalDatabase = async () => {
    setLocalDatabaseLoading(true);
    setDatabaseError(null);
    try {
      const { file } = await syncClient.exportStore();
      downloadFile(file);
    } catch (cause) {
      setDatabaseError(toError(cause));
    } finally {
      setLocalDatabaseLoading(false);
    }
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

      {databaseError != null && (
        <Alert color="red" title="Database export failed">
          {databaseError.message}
        </Alert>
      )}

      <ExportSection
        title="Canonical HTML"
        description="The complete canonical schedule as four unfiltered, original-style HTML tables."
      >
        <Button loading={canonicalLoading} disabled={error != null || canonicalEmpty} onClick={exportCanonicalHtml}>
          Download canonical HTML
        </Button>
      </ExportSection>

      <ExportSection
        title="Canonical database"
        description="Portable SQL containing only the canonical Show, Season, and Episode base tables and their data."
      >
        <Button loading={canonicalDatabaseLoading} onClick={() => void exportCanonicalDatabase()}>
          Download canonical database
        </Button>
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
            description="A complete PGlite store backup for this account, including sync metadata and unsynced local writes."
          >
            <Button loading={localDatabaseLoading} onClick={() => void exportLocalDatabase()}>
              Download complete local database
            </Button>
          </ExportSection>
        </>
      )}
    </Stack>
  );
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
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
