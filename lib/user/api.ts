import type { User } from "@/components/user/types";
import { request } from "@/lib/http/request";

export async function getUser() {
    return request<User>("/api/petugas");
}
