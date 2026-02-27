import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name")?.trim() || "";
    const cls  = searchParams.get("class")?.trim() || "";

    if (!name || !cls) {
      return NextResponse.json({ attempts: [] });
    }

    const { data, error } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("student_name", name)
      .eq("class", cls)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[/api/progress] Supabase error:", error.message);
      return NextResponse.json({ error: error.message, attempts: [] }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ attempts: [] });
    }

    const attempts = data.map((d: any) => {
      const rawScore =
        d.percentage    ??
        d.score_percent ??
        d.scorePercent  ??
        d.score         ??
        null;
      const scoreNum = rawScore !== null ? Number(rawScore) : undefined;

      return {
        id:               d.id,
        date:             d.created_at,
        mode:             "examiner" as const,
        subject:          d.subject || "General",
        chapters:         Array.isArray(d.chapters) ? d.chapters : [],
        timeTakenSeconds: d.time_taken_seconds ?? 0,
        rawAnswerText:    "",
        scorePercent:     scoreNum !== undefined && !isNaN(scoreNum) ? scoreNum : undefined,
      };
    }).filter((a: any) => typeof a.scorePercent === "number");

    return NextResponse.json({ attempts });

  } catch (err: any) {
    console.error("[/api/progress] Unhandled error:", err);
    return NextResponse.json({ error: err?.message || "Server error", attempts: [] }, { status: 500 });
  }
}