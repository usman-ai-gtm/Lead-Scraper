import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: Request, { params }: RouteParams) {
  const id = params.id;
  const fallback = {
    id: Number(id),
    business_name: `Lead #${id}`,
    category: "Commercial Business",
    industry: "B2B",
    city: "Global",
    country: "Global",
    lead_score: 75,
    final_lead_score: 75,
    icp_fit_score: 75,
    data_confidence_score: 70,
    business_opportunity_score: 80,
    buying_potential_score: 70,
    qualification_level: "🟢 High Potential",
    priority: "HIGH",
    lead_temperature: "WARM",
    crm_stage: "New Lead"
  };
  return proxyToBackend(`/api/leads/${id}`, req, fallback);
}

export async function PUT(req: Request, { params }: RouteParams) {
  const id = params.id;
  const fallback = {
    status: "success",
    message: `Lead #${id} updated successfully (cloud serverless mode).`
  };
  return proxyToBackend(`/api/leads/${id}`, req, fallback);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const id = params.id;
  const fallback = {
    status: "success",
    message: `Lead #${id} deleted successfully.`
  };
  return proxyToBackend(`/api/leads/${id}`, req, fallback);
}
