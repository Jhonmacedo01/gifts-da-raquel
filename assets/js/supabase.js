import { hasSupabaseConfig, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js";

let client;
export function getSupabase() {
  if (!hasSupabaseConfig()) return null;
  if (!window.supabase?.createClient) throw new Error("A biblioteca Supabase não foi carregada.");
  client ??= window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export async function getAdminSession() {
  const supabase = getSupabase();
  if (!supabase) return { configured: false, user: null };
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { configured: true, user: null };
  const { data: admin, error: adminError } = await supabase
    .from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (adminError || !admin) {
    await supabase.auth.signOut();
    return { configured: true, user: null };
  }
  return { configured: true, user };
}
