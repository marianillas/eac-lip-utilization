// app/api/utilization/route.js
// GET /api/utilization?track=eac|lip&start=YYYY-MM-DD&end=YYYY-MM-DD

import { NextResponse } from "next/server";
import { getTimeEntries, summarizeUtilization } from "@/lib/clickup-utilization";

// The team logs time in Nevada, which is on Pacific time (Los Angeles
// observes the same clock/DST rules as the rest of Nevada).
const BUSINESS_TIME_ZONE = "America/Los_Angeles";

// Converts a "YYYY-MM-DD" wall-clock date (start or end of day) in
// BUSINESS_TIME_ZONE into the correct UTC epoch ms. Needed because the
// server runs in UTC, so a naive `new Date("2026-07-01T00:00:00")` would
// be midnight UTC instead of midnight Pacific, shifting the whole range
// by several hours and mis-including/excluding entries near the edges.
function zonedDayBoundaryMs(dateStr, endOfDay) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, mi, s, ms] = endOfDay ? [23, 59, 59, 999] : [0, 0, 0, 0];

  const guessMs = Date.UTC(y, m - 1, d, h, mi, s, ms);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(guessMs)).filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );
  const renderedMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
    ms
  );

  return guessMs + (guessMs - renderedMs);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const trackParam = searchParams.get("track");
  const track = trackParam === "lip" || trackParam === "total" ? trackParam : "eac";
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const startMs = start
    ? zonedDayBoundaryMs(start, false)
    : Date.now() - 7 * 24 * 3600 * 1000;
  const endMs = end ? zonedDayBoundaryMs(end, true) : Date.now();

  try {
    const { entries, staff } = await getTimeEntries(startMs, endMs);
    const summary = summarizeUtilization({ entries, staff, track });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
