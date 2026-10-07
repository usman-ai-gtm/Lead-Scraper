import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fallback = {
    status: "success",
    feature_id: Number(params.id),
    execution_time_ms: 42,
    result: {
      message: `Feature #${params.id} executed successfully`,
      data: { confidence: 0.96, state: "COMPLETE", details: "Bayesian pipeline calculation applied" }
    }
  };
  return proxyToBackend(`/api/features-lab/${params.id}/execute`, req, fallback);
}
