import { neonAuth } from "@/lib/auth/neon";

export const { DELETE, GET, PATCH, POST, PUT } = neonAuth.handler();
