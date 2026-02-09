import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // 🔍 HARD PROOF RESPONSE
    return NextResponse.json({
      ok: true,
      hasKey: Boolean(apiKey),
      keyLength: apiKey ? apiKey.length : 0,
      runtime: "nodejs",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "crash" },
      { status: 500 }
    );
  }
}
