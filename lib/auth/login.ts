import "server-only";

import { supabaseServer } from "@/lib/supabase/server";

export async function signInWithEmailAndPassword(email: string, password: string) {
  return supabaseServer.auth.signInWithPassword({ email, password });
}
