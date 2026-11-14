import { getAdminSession, getSupabase } from "./supabase.js";

const authMessage = document.querySelector("#auth-message");
const root = document.querySelector("#dashboard");
const statuses = ["Aguardando aprovação", "Aguardando pagamento", "Aprovado", "Em produção", "Pronto para entrega", "Entregue", "Cancelado"];
const statusStyle = { "Aguardando aprovação": "review", "Aguardando pagamento": "payment", "Aprovado": "production", "Em produção": "production", "Pronto para entrega": "ready", "Entregue": "ready", "Cancelado": "cancelled" };
let orders = [];
let metrics = { active: 0, deliveries: 0, revenue: 0, stock: 0, minimum: 0, tiers: [] };
let section = "Visão geral";
let query = "";
let filter = "Todos os pedidos";
let toastTimer;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const money = (value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const icon = (symbol) => `<span class="simple-icon" aria-hidden="true">${symbol}</span>`;
const orderStatus = {
  received: "Aguardando aprovação", awaiting_approval: "Aguardando aprovação",
  awaiting_payment: "Aguardando pagamento", approved: "Aprovado", in_production: "Em produção",
  ready: "Pronto para entrega", delivered: "Entregue", cancelled: "Cancelado",
};
const formatDate = (value) => value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`)).replace(" de ", " ") : "A definir";

async function loadDashboard() {
  const supabase = getSupabase();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const today = now.toISOString().slice(0, 10);
  const nextWeek = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const [recent, active, deliveries, sales, stock, tiers] = await Promise.all([
    supabase.from("orders").select("id,order_number,quantity,total_amount,shipping_fee,status,created_at,delivery_due_date,customers(full_name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("orders").select("id", { count: "exact", head: true }).not("status", "in", "(delivered,cancelled)"),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("delivery_due_date", today).lte("delivery_due_date", nextWeek).not("status", "in", "(delivered,cancelled)"),
    supabase.from("orders").select("total_amount").eq("payment_status", "paid").gte("paid_at", monthStart).lt("paid_at", nextMonth),
    supabase.from("materials").select("quantity_on_hand,minimum_quantity"),
    supabase.from("price_tiers").select("min_quantity,max_quantity,unit_price").eq("is_active", true).order("min_quantity"),
  ]);
  const failed = [recent, active, deliveries, sales, stock, tiers].find((result) => result.error);
  if (failed) throw failed.error;
  orders = (recent.data || []).map((row) => ({
    id: `GR-${now.getFullYear()}-${String(row.order_number).padStart(5, "0")}`,
    name: row.customers?.full_name || "Cliente",
    quantity: row.quantity,
    amount: Number(row.total_amount || 0),
    shippingFee: row.shipping_fee == null ? null : Number(row.shipping_fee),
    status: orderStatus[row.status] || row.status,
    date: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(row.created_at)),
    due: formatDate(row.delivery_due_date),
  }));
  metrics = {
    active: active.count || 0,
    deliveries: deliveries.count || 0,
    revenue: (sales.data || []).reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    stock: (stock.data || []).length,
    minimum: (stock.data || []).filter((row) => Number(row.quantity_on_hand || 0) <= Number(row.minimum_quantity || 0)).length,
    tiers: tiers.data || [],
  };
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) { toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); document.body.append(toast); }
  toast.innerHTML = `<span>✓</span>${escapeHtml(message)}<button aria-label="Fechar aviso">×</button>`;
  toast.querySelector("button").onclick = () => toast.remove();
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.remove(), 3500);
}

function render() {
  const filtered = orders.filter((order) => `${order.id} ${order.name}`.toLowerCase().includes(query.toLowerCase()) && (filter === "Todos os pedidos" || order.status === filter));
  const approvals = orders.filter((order) => order.status === "Aguardando aprovação").length;
  const payments = orders.filter((order) => order.status === "Aguardando pagamento").length;
  const nextDelivery = orders.find((order) => order.due !== "A definir" && !["Entregue", "Cancelado"].includes(order.status));
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const sections = ["Visão geral", "Pedidos", "Agenda", "Estoque", "Clientes", "Financeiro"];
  root.innerHTML = `
    <aside class="sidebar"><a class="brand" href="/"><span class="brand-mark">♡<span>G</span></span><span class="brand-name">gifts <b>da Raquel</b><small>PAINEL DE GESTÃO</small></span></a>
      <div class="workspace"><span class="workspace-avatar">R</span><span><b>Gifts da Raquel</b><small>Minha loja</small></span><span class="workspace-chevron">⌄</span></div>
      <div class="nav-label">MENU PRINCIPAL</div><nav class="side-nav" aria-label="Navegação principal">${sections.map((label) => { const available = ["Visão geral", "Pedidos"].includes(label); return `<button class="nav-item ${section === label ? "active" : ""}" data-section="${label}" ${available ? "" : "disabled title=\"Disponível em uma próxima fase\""}>${icon("▦")}<span>${label}</span>${label === "Pedidos" ? `<i class="nav-count">${orders.length}</i>` : ""}</button>`; }).join("")}</nav>
      <div class="sidebar-bottom"><div class="help-card"><span class="help-spark">✦</span><b>Precisa de ajuda?</b><p>Estamos aqui para facilitar seu dia.</p><button data-toast="Central de ajuda: suporte da Gifts da Raquel.">Falar com suporte →</button></div><div class="profile"><span class="profile-avatar">R</span><span><b>Raquel</b><small>Administradora</small></span><button class="logout-button" id="logout">Sair</button></div></div></aside>
    <main class="main-area"><header class="topbar"><div class="breadcrumb">Painel › <b>${escapeHtml(section)}</b></div><div class="top-actions"><span class="today-label">${escapeHtml(today)}</span><button class="icon-button" data-toast="Você está em dia com as notificações." aria-label="Notificações">♧</button></div></header>
      <div class="content"><div class="welcome-row"><div><div class="eyebrow">${escapeHtml(today).toLocaleUpperCase("pt-BR")}</div><h1>Bom dia, Raquel <span class="wave">✦</span></h1><p class="welcome-copy">Aqui está o resumo da sua loja hoje. <span>Um passo de cada vez, com carinho.</span></p></div><button class="primary-button" id="new-order">＋ Novo pedido</button></div>
      <div class="demo-note"><span class="demo-dot"></span> Visão geral e pedidos estão conectados. Agenda, estoque, clientes e financeiro ainda não estão disponíveis.</div>
      <section class="stats-grid" aria-label="Resumo da loja"><article class="stat-card"><div class="stat-top"><span class="stat-icon rose">▤</span><span class="stat-period">Agora</span></div><div class="stat-value">${metrics.active}</div><div class="stat-label">Pedidos ativos</div><div class="stat-foot">Pedidos não concluídos</div></article><article class="stat-card"><div class="stat-top"><span class="stat-icon peach">◷</span><span class="stat-period">7 dias</span></div><div class="stat-value">${metrics.deliveries}</div><div class="stat-label">Entregas próximas</div><div class="stat-foot">Com data de entrega prevista</div></article><article class="stat-card"><div class="stat-top"><span class="stat-icon green">✓</span><span class="stat-period">Este mês</span></div><div class="stat-value">${money(metrics.revenue)}</div><div class="stat-label">Recebido no mês</div><div class="stat-foot">Pedidos com pagamento confirmado</div></article><article class="stat-card"><div class="stat-top"><span class="stat-icon lavender">▱</span><span class="stock-warning">${metrics.minimum ? "Atenção" : "Em dia"}</span></div><div class="stat-value">${metrics.stock} <small>itens</small></div><div class="stat-label">Materiais cadastrados</div><div class="stat-foot">${metrics.minimum} no nível mínimo ou abaixo</div></article></section>
      <div class="dashboard-grid"><section class="panel orders-panel"><div class="panel-heading"><div><div class="panel-kicker">${section === "Pedidos" ? "GERENCIAMENTO" : "ACOMPANHE DE PERTO"}</div><h2>${section === "Pedidos" ? "Pedidos" : "Pedidos recentes · até 100"} <span class="heading-count">${filtered.length}</span></h2></div><button class="text-link" data-section="Pedidos">Ver todos →</button></div>
      <div class="order-tools"><label class="search-box">⌕ <input id="search" aria-label="Buscar pedido ou cliente" placeholder="Buscar pedido ou cliente..." value="${escapeHtml(query)}"></label><select id="filter" aria-label="Filtrar pedidos"><option>Todos os pedidos</option>${statuses.map((status) => `<option ${filter === status ? "selected" : ""}>${status}</option>`).join("")}</select></div>
      <div class="table-wrap"><table><thead><tr><th>PEDIDO</th><th>CLIENTE</th><th>ITENS</th><th>VALOR</th><th>FRETE</th><th>STATUS</th><th>ENTREGA</th><th></th></tr></thead><tbody>${filtered.map((order) => `<tr><td class="order-id">${escapeHtml(order.id)}<small>${escapeHtml(order.date)}</small></td><td><div class="customer"><span class="customer-avatar">${initials(order.name)}</span><b>${escapeHtml(order.name)}</b></div></td><td>${order.quantity} ímãs</td><td class="amount">${order.amount ? money(order.amount) : "A confirmar"}</td><td>${order.shippingFee == null ? "—" : money(order.shippingFee)}</td><td><span class="status-pill ${statusStyle[order.status]}"><i></i>${escapeHtml(order.status)}</span></td><td class="due-date">${escapeHtml(order.due)}</td><td><button class="row-menu" data-order="${escapeHtml(order.id)}" aria-label="Opções do pedido ${escapeHtml(order.id)}">···</button></td></tr>`).join("")}</tbody></table>${filtered.length ? "" : `<div class="empty-state">Nenhum pedido encontrado com esse filtro.</div>`}</div></section>
      <div class="right-column"><section class="panel attention-panel"><div class="panel-heading compact"><div><div class="panel-kicker">PARA HOJE</div><h2>Precisam de você</h2></div><span class="attention-total">${approvals + payments + metrics.deliveries}</span></div><div class="attention-list"><button data-filter="Aguardando aprovação"><span class="attention-icon review-bg">▤</span><span><b>Fotos para aprovar</b><small>${approvals} ${approvals === 1 ? "pedido aguardando" : "pedidos aguardando"}</small></span>›</button><button data-filter="Aguardando pagamento"><span class="attention-icon payment-bg">$</span><span><b>Pagamento pendente</b><small>${payments} ${payments === 1 ? "pedido aguardando" : "pedidos aguardando"}</small></span>›</button><button ${nextDelivery ? `data-toast="${escapeHtml(`${nextDelivery.name} · entrega prevista para ${nextDelivery.due}`)}"` : "data-toast=\"Nenhuma entrega próxima cadastrada.\""}><span class="attention-icon delivery-bg">▦</span><span><b>Entrega se aproximando</b><small>${nextDelivery ? `${escapeHtml(nextDelivery.name)} · ${escapeHtml(nextDelivery.due)}` : "Nenhuma data próxima"}</small></span>›</button></div></section>
      <section class="panel price-panel"><div class="panel-heading compact"><div><div class="panel-kicker">PREÇOS ATUAIS</div><h2>Ímãs personalizados</h2></div><span class="price-size">6 × 6 cm</span></div><div class="price-list">${metrics.tiers.map((tier) => `<div><span>${tier.min_quantity === tier.max_quantity ? `${tier.min_quantity} unidade${tier.min_quantity === 1 ? "" : "s"}` : `A partir de ${tier.min_quantity} unidades`}</span><b>${money(tier.unit_price)} <small>/ cada</small></b></div>`).join("") || "<div><span>Nenhuma faixa cadastrada</span></div>"}</div><div class="price-note">Faixas de preço cadastradas no Supabase.</div></section></div></div>
      <footer class="footer-note"><span>Feito com <span class="footer-heart">♥</span> para guardar momentos especiais.</span><span>Gifts da Raquel · Painel administrativo</span></footer></div></main>
      <dialog class="modal" id="order-modal"><div class="modal-heading"><div><div class="panel-kicker">REGISTRO RÁPIDO</div><h2>Novo pedido</h2></div><button class="close-button" id="close-modal" aria-label="Fechar">×</button></div><p class="modal-copy">Os dados são gravados no Supabase. O valor pode ficar em branco para confirmar depois.</p><form id="order-form"><label>Nome do cliente<input name="name" required maxlength="120" placeholder="Ex.: Ana Oliveira"></label><label>Telefone<input name="phone" type="tel" required minlength="8" maxlength="24" placeholder="(11) 99999-9999"></label><label>Quantidade de ímãs<input name="quantity" type="number" required min="1" max="500" placeholder="Ex.: 12"></label><label>Total acordado (inclui frete) (R$)<input name="amount" type="number" min="0" step="0.01" placeholder="Opcional"></label><div class="modal-actions"><button type="button" class="secondary-button" id="cancel-modal">Cancelar</button><button type="submit" class="primary-button">Salvar pedido</button></div></form></dialog>`;
  root.hidden = false;
  authMessage.hidden = true;
  bindEvents();
}

function bindEvents() {
  root.querySelectorAll("[data-section]").forEach((button) => button.addEventListener("click", () => {
    if (button.disabled) return;
    const next = button.dataset.section;
    if (["Visão geral", "Pedidos"].includes(next)) { section = next; render(); }
  }));
  root.querySelectorAll("[data-toast]").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.toast)));
  root.querySelector("#search").addEventListener("input", (event) => { query = event.target.value; render(); const input = root.querySelector("#search"); input.focus(); input.setSelectionRange(query.length, query.length); });
  root.querySelector("#filter").addEventListener("change", (event) => { filter = event.target.value; render(); });
  root.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { section = "Pedidos"; filter = button.dataset.filter; render(); }));
  root.querySelectorAll("[data-order]").forEach((button) => button.addEventListener("click", () => { const order = orders.find((item) => item.id === button.dataset.order); showToast(`${order.id} · ${order.name} · ${order.status}`); }));
  const modal = root.querySelector("#order-modal");
  root.querySelector("#new-order").addEventListener("click", () => modal.showModal());
  root.querySelector("#close-modal").addEventListener("click", () => modal.close());
  root.querySelector("#cancel-modal").addEventListener("click", () => modal.close());
  root.querySelector("#order-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Salvando…";
    try {
      const { data: orderNumber, error } = await getSupabase().rpc("create_order_for_admin", {
        p_full_name: String(data.get("name")).trim(),
        p_phone: String(data.get("phone")).trim(),
        p_quantity: Number(data.get("quantity")),
        p_total_amount: data.get("amount") ? Number(data.get("amount")) : null,
      });
      if (error) throw error;
      modal.close();
      form.reset();
      await loadDashboard();
      section = "Pedidos";
      render();
      showToast(`Pedido ${new Date().getFullYear()}-${String(orderNumber).padStart(5, "0")} salvo.`);
    } catch {
      showToast("Não foi possível salvar. Confira os dados e tente novamente.");
      button.disabled = false;
      button.textContent = "Salvar pedido";
    }
  });
  root.querySelector("#logout").addEventListener("click", async () => { await getSupabase()?.auth.signOut(); location.replace("/login"); });
}

try {
  const session = await getAdminSession();
  if (!session.configured) { authMessage.innerHTML = '<section class="login-card"><b>Supabase não configurado nesta publicação</b><p class="login-intro">Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente do Render e publique novamente.</p><a class="login-back" href="/login">Ir para o login</a></section>'; }
  else if (!session.user) location.replace("/login");
  else {
    await loadDashboard();
    render();
  }
} catch {
  authMessage.innerHTML = '<section class="login-card"><b>Não foi possível validar o acesso</b><p class="login-intro">Confira sua conexão e tente novamente.</p><a class="login-back" href="/login">Voltar ao login</a></section>';
}

