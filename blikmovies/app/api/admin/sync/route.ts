import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncMoviesToSupabase } from "@/lib/sync-movies";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", userData.user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const result = await syncMoviesToSupabase({ source: "admin", enrichTrailers: true, trailerLimit: 40 });
    if (result.error) return NextResponse.json(result, { status: 502 });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
