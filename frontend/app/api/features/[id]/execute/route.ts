import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const fid = parseInt(params.id, 10);
    const body = await req.json().catch(() => ({}));

    const mockOutput = {
      feature_id: fid,
      status: "COMPLETED",
      execution_mode: body.mode || "QUALITY MODE",
      timestamp: new Date().toISOString(),
      lead_id: body.lead_id || 1,
      result: {
        score: Math.floor(Math.random() * 25) + 75,
        confidence: 0.89,
        summary: `Execution successful for Feature #${fid}. Synthesized intelligence signals from multi-source pipeline.`,
        key_findings: [
          "Target firmographic profile verified against active registry.",
          "High decision-maker engagement signals observed in recent 14-day window.",
          "Recommended cadence: Multi-touch cold email + WhatsApp executive outreach."
        ],
        evidence: [
          { source: "Domain DNS & Web Crawl", confidence: 0.95, status: "Verified" },
          { source: "Executive Persona Matrix", confidence: 0.88, status: "Mapped" },
          { source: "GTM Intent Radar", confidence: 0.84, status: "Active" }
        ],
        recommended_action: "Add to high-priority Outreach Campaign with tailored value proposition."
      }
    };

    return NextResponse.json(mockOutput);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
