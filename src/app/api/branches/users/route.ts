import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const sessionClient = await createSupabaseServerClient();
  if (!sessionClient) return NextResponse.json({ error: "Supabase sozlamalari topilmadi." }, { status: 500 });

  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Autentifikatsiya talab qilinadi." }, { status: 401 });

  const { data: profile, error: profileError } = await sessionClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || (profile && profile.role !== "admin")) {
    return NextResponse.json({ error: "Faqat admin ko'chma kutubxona foydalanuvchisi yarata oladi." }, { status: 403 });
  }

  const body = await request.json() as { branchId?: string; email?: string; password?: string };
  if (!body.branchId || !body.email || !body.password || body.password.length < 6) {
    return NextResponse.json({ error: "Ko'chma kutubxona, email va kamida 6 belgili parol kiriting." }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY server muhitida sozlanmagan." }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: branch, error: branchError } = await adminClient.from("branches").select("id").eq("id", body.branchId).maybeSingle();
  if (branchError || !branch) return NextResponse.json({ error: "Ko'chma kutubxona topilmadi." }, { status: 404 });

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: body.email.trim(),
    password: body.password,
    email_confirm: true,
  });
  if (createError || !created.user) return NextResponse.json({ error: createError?.message ?? "Foydalanuvchi yaratilmadi." }, { status: 400 });

  const { error: profileCreateError } = await adminClient.from("profiles").insert({
    id: created.user.id,
    email: body.email.trim(),
    role: "branch",
    branch_id: body.branchId,
  });
  if (profileCreateError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: `Profil yaratilmadi: ${profileCreateError.message}` }, { status: 400 });
  }

  return NextResponse.json({ id: created.user.id });
}
