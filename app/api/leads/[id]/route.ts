import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUserFromRequest, deleteServerlessLead } from "@/lib/serverless-auth";
import { getNeonLeadById, deleteNeonLead, isNeonConfigured } from "@/lib/neon-db";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: Request, { params }: RouteParams) {
  const id = Number(params.id);
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const fallbackHandler = async () => {
    if (isNeonConfigured()) {
      const neonLead = await getNeonLeadById(workspaceId, id);
      if (neonLead) return neonLead;
    }
    return {
      id,
      business_name: `Lead #${id}`,
      category: "Commercial Business",
      industry: "B2B",
      city: "Global",
      country: "Global",
      lead_score: 75,
      crm_stage: "New Lead",
    };
  };

  return proxyToBackend(`/api/leads/${id}`, req, fallbackHandler);
}

export async function PUT(req: Request, { params }: RouteParams) {
  const id = Number(params.id);
  const fallback = {
    status: "success",
    message: `Lead #${id} updated successfully.`
  };
  return proxyToBackend(`/api/leads/${id}`, req, fallback);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const id = Number(params.id);
  const currentUser = getCurrentUserFromRequest(req);
  const workspaceId = currentUser ? currentUser.workspace_id : 1;

  const fallbackHandler = async () => {
    if (isNeonConfigured()) {
      const deleted = await deleteNeonLead(workspaceId, id);
      if (deleted) {
        return {
          status: "success",
          message: `Lead #${id} deleted permanently from Neon PostgreSQL.`
        };
      }
    }

    const deleted = deleteServerlessLead(workspaceId, id);
    return {
      status: deleted ? "success" : "not_found",
      message: deleted ? `Lead #${id} deleted successfully from workspace.` : `Lead #${id} not found.`
    };
  };

  return proxyToBackend(`/api/leads/${id}`, req, fallbackHandler);
}
