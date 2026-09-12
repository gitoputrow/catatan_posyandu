import "server-only";

import { neonAuth } from "@/lib/auth/neon";

export async function signInWithEmailAndPassword(email: string, password: string) {
  return neonAuth.signIn.email({ email, password });
}
