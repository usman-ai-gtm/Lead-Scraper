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
    message: `Client #${id} status updated.`
  };
  return proxyToBackend(`/api/admin/clients/${id}/status`, req, fallback);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const id = params.id;
  const fallback = {
    status: "success",
    client_id: Number(id),
    new_status: "REVOKED",
    message: `Client #${id} revoked.`
  };
  return proxyToBackend(`/api/admin/clients/${id}`, req, fallback);
}

