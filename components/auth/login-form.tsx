"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { useLogin } from "@/hooks/api/use-login";

export function LoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { errorMessage, isLoading, login } = useLogin();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const isLoggedIn = await login(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    );

    if (isLoggedIn) window.location.assign("/dashboard");
  }

  return (
    <Form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      <FormField autoComplete="email" id="email" label="Email" name="email" placeholder="nama@email.com" required type="email" />

      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label
            className="block text-sm font-semibold text-text-primary"
            htmlFor="password"
          >
            Password
          </label>
          <a
            className="text-xs font-semibold text-primary transition hover:text-primary/80"
            href="#"
          >
            Lupa password?
          </a>
        </div>
        <div className="relative">
          <input
            autoComplete="current-password"
            className="h-12 w-full rounded-lg border border-border bg-surface px-4 pr-12 text-sm text-text-primary outline-none transition placeholder:text-text-disabled focus:border-primary focus:ring-4 focus:ring-primary/10"
            id="password"
            name="password"
            placeholder="Masukkan password"
            required
            type={isPasswordVisible ? "text" : "password"}
          />
          <button
            aria-label={
              isPasswordVisible ? "Sembunyikan password" : "Tampilkan password"
            }
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-lg text-text-secondary transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            type="button"
          >
            {isPasswordVisible ? (
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9.3 5.1 9.8 7.8a10.8 10.8 0 01-4 5.6M6.2 6.2A10.8 10.8 0 002.2 12c.5 2.7 4.3 7.8 9.8 7.8 1 0 2-.2 2.9-.6" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M2.2 12C2.7 9.3 6.5 4.2 12 4.2s9.3 5.1 9.8 7.8c-.5 2.7-4.3 7.8-9.8 7.8S2.7 14.7 2.2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-center mt-1.5 gap-2.5 text-sm text-text-secondary">
        <input
          className="size-4 rounded border-border accent-primary"
          name="remember"
          type="checkbox"
        />
        Ingat saya di perangkat ini
      </label>

      {errorMessage && (
        <p aria-live="polite" className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">
          {errorMessage}
        </p>
      )}

      <Button className="w-full mt-3" isLoading={isLoading} size="lg" type="submit">
        Masuk ke Dashboard
      </Button>
    </Form>
  );
}
