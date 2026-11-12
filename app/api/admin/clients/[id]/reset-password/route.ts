import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  const id = params.id;
  const fallback = {
    status: "success",
    client_id: Number(id),
    temporary_password: "TEMP_" + Math.random().toString(36).substring(2, 12).toUpperCase() + "!",
    must_change_password: true,
    message: "Temporary password regenerated. Share securely with client."
  };
  return proxyToBackend(`/api/admin/clients/${id}/reset-password`, req, fallback);
}

