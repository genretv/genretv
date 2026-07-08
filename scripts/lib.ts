import net from "node:net";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";

export async function canConnect(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });

    const finish = (value: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function waitForTcpService(
  host: string,
  port: number,
  label: string,
  timeoutMs = 120_000,
  intervalMs = 500,
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await canConnect(host, port)) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${label} at ${host}:${port}`);
}

export async function waitForPgReady(databaseUrl: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  const db = drizzle(databaseUrl);

  try {
    while (Date.now() - start < timeoutMs) {
      try {
        await db.execute(sql`SELECT 1`);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new Error("Timed out waiting for PostgreSQL to accept queries");
  } finally {
    await db.$client.close();
  }
}

export async function waitForHttpOk(url: string, name: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.status < 500) return;
    } catch {
      // Service is not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${name} (${url}) to answer`);
}
