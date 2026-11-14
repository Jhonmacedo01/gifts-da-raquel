import { hasSupabaseConfig } from "./config.js";
import { getAdminSession, getSupabase } from "./supabase.js";

const form = document.querySelector("#login-form");
const setup = document.querySelector("#setup");
if (!hasSupabaseConfig()) setup.hidden = false;
else {
  form.hidden = false;
  try {
    const session = await getAdminSession();
    if (session.user) location.replace("/admin/dashboard");
  } catch { /* Mantém o formulário disponível quando o serviço está temporariamente indisponível. */ }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  const errorBox = document.querySelector("#login-error");
  const data = new FormData(form);
  const email = String(data.get("email")).trim();
  const password = String(data.get("password"));
  errorBox.hidden = true;
  button.disabled = true;
  button.textContent = "Entrando…";
  try {
    const supabase = getSupabase();
    const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !result.user) throw new Error("E-mail ou senha inválidos.");
    const { data: admin, error: adminError } = await supabase.from("admin_users")
      .select("user_id").eq("user_id", result.user.id).maybeSingle();
    if (adminError || !admin) {
      await supabase.auth.signOut();
      throw new Error("Esta conta não tem acesso ao painel.");
    }
    location.assign("/admin/dashboard");
  } catch (error) {
    errorBox.textContent = error instanceof Error && error.message.includes("acesso")
      ? error.message : error instanceof Error && error.message.includes("inválidos")
        ? error.message : "Não foi possível acessar o Supabase. Confira a configuração e tente novamente.";
    errorBox.hidden = false;
    button.disabled = false;
    button.textContent = "Entrar no painel";
  }
});
