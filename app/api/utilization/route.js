// app/api/utilization/route.js
// GET /api/utilization?track=eac|lip&start=YYYY-MM-DD&end=YYYY-MM-DD

import { NextResponse } from "next/server";
import { getTimeEntries, summarizeUtilization } from "@/lib/clickup-utilization";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const track = searchParams.get("track") === "lip" ? "lip" : "eac";
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const startMs = start
    ? new Date(`${start}T00:00:00`).getTime()
    : Date.now() - 7 * 24 * 3600 * 1000;
  const endMs = end ? new Date(`${end}T23:59:59`).getTime() : Date.now();

  try {
    const { entries, staff } = await getTimeEntries(startMs, endMs);
    const summary = summarizeUtilization({ entries, staff, track });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
