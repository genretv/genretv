import { drizzle } from "drizzle-orm/bun-sql";
import { defineRelations } from "drizzle-orm/relations";

import { buildRegistrySchema } from "@pgxsinkit/server";

import { genretvSyncRegistry } from "../domain/registry";

const schema = buildRegistrySchema(genretvSyncRegistry);
const relations = defineRelations(schema);

export function createBunGenretvDb(connection: string) {
  return drizzle({ connection, relations });
}
