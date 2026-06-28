import { request } from "@/lib/http/request";

type LoginResponse = {
  message?: string;
};

export async function loginWithEmail(email: string, password: string) {
  return request<LoginResponse>("/api/auth/login", {
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }, "Login gagal. Silakan coba lagi.");
}

export async function logout() {
  return request<{ message: string }>("/api/auth/logout", { method: "POST" }, "Logout gagal. Silakan coba lagi.");
}
