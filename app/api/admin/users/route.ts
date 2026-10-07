import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const fallback = {
    users: [
      { id: 1, email: "admin@usmanai.com", full_name: "Muhammad Usman", role: "ADMIN", status: "ACTIVE", last_login: "Just now" },
      { id: 2, email: "manager@usmanai.com", full_name: "Sales Director", role: "MANAGER", status: "ACTIVE", last_login: "2 hours ago" }
    ]
  };
  return proxyToBackend("/api/admin/users", req, fallback);
}
