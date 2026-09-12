import "server-only";

import { neonAuth } from "@/lib/auth/neon";

export async function signOut() {
  await neonAuth.signOut();
}
