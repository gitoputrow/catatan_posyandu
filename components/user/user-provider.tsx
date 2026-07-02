"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { User } from "@/components/user/types";
import { logout } from "@/lib/auth/api";
import { isConnectionError } from "@/lib/http/request";
import { getUser } from "@/lib/user/api";

type UserContextValue = {
  canManage: boolean;
  error: string | null;
  isLoading: boolean;
  user: User | null;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setUser(await getUser());
    } catch (fetchError) {
      console.error("Error fetching user:", fetchError);
      if (isConnectionError(fetchError)) {
        setError("Koneksi bermasalah. Data petugas gagal dimuat.");
        return;
      }

      try {
        await logout();
      } catch (logoutError) {
        console.error("Error clearing user session:", logoutError);
      } finally {
        router.replace("/login");
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchUser(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchUser]);

  const value = useMemo(
    () => ({
      canManage:
        Boolean(user) &&
        user?.role?.toLowerCase() !== "viewer" &&
        user?.jenis_petugas?.toLowerCase() !== "viewer",
      error,
      isLoading,
      user,
    }),
    [error, isLoading, user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useCurrentUser harus digunakan di dalam UserProvider.");
  return context;
}
