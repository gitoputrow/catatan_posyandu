import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

type DatabaseRequestContext = {
  authUserId: string | null;
};

const databaseRequestContext = new AsyncLocalStorage<DatabaseRequestContext>();

export function withDatabaseRequestContext<T>(
  authUserId: string | null,
  callback: () => Promise<T>,
) {
  return databaseRequestContext.run({ authUserId }, callback);
}

export function getDatabaseRequestAuthUserId() {
  return databaseRequestContext.getStore()?.authUserId;
}
