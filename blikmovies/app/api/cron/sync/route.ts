import { NextResponse } from "next/server";
import { syncMoviesToSupabase } from "@/lib/sync-movies";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncMoviesToSupabase({ source: "cron", enrichTrailers: true, trailerLimit: 30 });
    if (result.error) return NextResponse.json(result, { status: 502 });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
