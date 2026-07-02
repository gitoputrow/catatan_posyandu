import "server-only";

import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const session = await getSession();

  try {
    if (session.accessToken) {
      const supabase = createSupabaseServerClient(session.accessToken);
      await supabase.auth.signOut({ scope: "local" });
    }
  } finally {
    await session.destroy();
  }
}
