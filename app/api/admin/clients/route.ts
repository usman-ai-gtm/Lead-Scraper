import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { provisionServerlessClient, listServerlessClients } from "@/lib/serverless-auth";

export async function GET(req: Request) {
  const fallback = () => listServerlessClients();
  return proxyToBackend("/api/admin/clients", req, fallback);
}

export async function POST(req: Request) {
  const fallback = async () => {
    try {
      const body = await req.clone().json();
      const clientName = body.full_name || body.client_name || "Client User";
      const res = provisionServerlessClient({
        email: body.email,
        fullName: clientName,
        company: body.company,
        maxLeadsQuota: body.max_leads_quota || 5000
      });
      return {
        status: "success",
        client_id: res.client.id,
        email: res.client.email,
        client_name: res.client.full_name,
        full_name: res.client.full_name,
        company: res.client.company,
        workspace_id: res.client.workspace_id,
        workspace_name: body.workspace_name || `${res.client.company || res.client.full_name}'s Private Workspace`,
        temporary_password: res.temporaryPassword,
        must_change_password: true,
        active_seats_used: 1,
        seats_remaining: 49,
        message: "Client provisioned successfully (cloud serverless mode). Copy temporary password now."
      };
    } catch (e: any) {
      return { error: e.message || "Failed to provision client" };
    }
  };

  return proxyToBackend("/api/admin/clients", req, fallback);
}

