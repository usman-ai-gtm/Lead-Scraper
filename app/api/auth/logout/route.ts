import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const res = NextResponse.json({ status: "success", message: "Signed out" });
  res.cookies.set("usman_gtm_token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
