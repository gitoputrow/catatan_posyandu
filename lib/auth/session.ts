import "server-only";

import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";

export { type SessionData, sessionOptions } from "@/lib/auth/session-config";

import { sessionOptions, type SessionData } from "@/lib/auth/session-config";

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
