"use client";

import { useState } from "react";

import { loginWithEmail } from "@/lib/auth/api";

export function useLogin() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function login(email: string, password: string) {
    setErrorMessage("");
    setIsLoading(true);

    try {
      await loginWithEmail(email, password);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Login gagal. Silakan coba lagi.",
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  return { errorMessage, isLoading, login };
}
