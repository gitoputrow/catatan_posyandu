type ApiErrorResponse = {
  message?: string;
};

export function isConnectionError(error: unknown) {
  return error instanceof TypeError;
}

export async function request<T>(
  url: string,
  options?: RequestInit,
  fallbackMessage = "Terjadi kesalahan saat memproses permintaan.",
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const body = (await response.json()) as T & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(body.message ?? fallbackMessage);
  }

  return body;
}
