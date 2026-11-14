const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("preços definidos, frete fixo e quantidades sob orçamento", async () => {
  const { calculateOrder, SHIPPING_FEE, WHATSAPP_NUMBER } = await import("../assets/js/order-pricing.mjs");
  assert.equal(WHATSAPP_NUMBER, "5594992674980");
  assert.equal(SHIPPING_FEE, 10);
  for (const [quantity, unitPrice] of [[1, 15], [6, 12], [24, 12], [25, 10], [50, 9], [100, 8]]) {
    const result = calculateOrder(quantity);
    assert.equal(result.kind, "priced", `quantity ${quantity}`);
    assert.equal(result.unitPrice, unitPrice);
    assert.equal(result.subtotal, quantity * unitPrice);
    assert.equal(result.total, quantity * unitPrice + 10);
  }
  for (const quantity of [2, 5, 26, 49, 51, 99, 101, 500]) {
    const result = calculateOrder(quantity);
    assert.equal(result.kind, "quote", `quantity ${quantity}`);
    assert.equal(result.shippingFee, 10);
    assert.equal("total" in result, false, "do not invent a product price");
  }
  for (const quantity of [0, -1, 1.5, 501, "abc"]) {
    assert.equal(calculateOrder(quantity).kind, "invalid", `quantity ${quantity}`);
  }
});

test("loja mostra frete, usa o WhatsApp correto e mantém checkout manual", () => {
  const dashboard = read("assets/js/dashboard.js");
  const html = read("index.html");
  const migration = read("supabase/migrations/202611130001_initial_operations.sql");
  const shippingMigration = read("supabase/migrations/202611130002_fixed_shipping_fee.sql");
  const legacyShippingMigration = read("supabase/migrations/202611130003_allow_unknown_legacy_shipping.sql");
  const store = read("assets/js/store.mjs");
  const styles = read("assets/css/deploy.css");
  assert.match(html, /wa\.me\/5594992674980/);
  assert.match(html, /Frete fixo de R\$ 10,00 por pedido/);
  assert.match(html, /id="order-estimate"/);
  assert.match(styles, /\.storefront \.hero-copy > p[\s\S]*?font-size: 16px/);
  assert.match(styles, /\.order-summary[\s\S]*?font-size: 15px/);
  assert.match(html, /id="order-summary" class="order-summary" aria-live="polite"/);
  assert.match(html, /script type="module" src="\/assets\/js\/store\.mjs"/);
  assert.match(store, /window\.open\(`https:\/\/wa\.me\/\$\{WHATSAPP_NUMBER\}/);
  assert.match(dashboard, /create_order_for_admin/);
  assert.match(migration, /create table public\.payments/i);
  assert.match(migration, /create table public\.deliveries/i);
  assert.match(migration, /create table public\.order_photos/i);
  assert.doesNotMatch(dashboard, /\.storage\.from\(/);
  assert.doesNotMatch(dashboard, /createPaymentIntent|checkout\.sessions|paymentIntent/i);
  assert.match(shippingMigration, /shipping_fee is null or shipping_fee = 10/);
  assert.match(legacyShippingMigration, /alter column shipping_fee drop not null/i);
  assert.match(legacyShippingMigration, /drop constraint if exists orders_shipping_fee_check/i);
  assert.match(legacyShippingMigration, /shipping_fee is null or shipping_fee = 10/i);
  assert.match(dashboard, /shipping_fee,status/);
  assert.doesNotMatch(dashboard, /addBusinessDays|holidays|feriados/i);
  assert.doesNotMatch(dashboard, /cron|schedule|webhook/i);
});

test("Render Blueprint publica dist com rotas administrativas e cabeçalhos", () => {
  const blueprint = read("render.yaml");
  const build = read("build.js");
  assert.match(blueprint, /runtime: static/);
  assert.match(blueprint, /buildCommand: npm run build/);
  assert.match(blueprint, /staticPublishPath: \.\/dist/);
  assert.match(blueprint, /key: SUPABASE_URL[\s\S]*?sync: false/);
  assert.match(blueprint, /key: SUPABASE_PUBLISHABLE_KEY[\s\S]*?sync: false/);
  assert.match(blueprint, /source: \/admin\n\s+destination: \/dashboard\.html/);
  assert.match(blueprint, /source: \/admin\/dashboard\n\s+destination: \/dashboard\.html/);
  assert.match(blueprint, /source: \/privacidade\n\s+destination: \/privacidade\.html/);
  assert.match(blueprint, /name: Content-Security-Policy/);
  assert.match(blueprint, /value: public, max-age=86400/);
  assert.match(build, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(build, /JSON\.stringify\(supabaseKey\)/);
});

test("build gera páginas de entrada do painel nos caminhos simples do Render", () => {
  const build = read("build.js");
  assert.match(build, /path\.join\(output, "admin\.html"\)/);
  assert.match(build, /path\.join\(adminOutput, file\)/);
  assert.match(build, /"privacidade\.html"/);
  assert.match(build, /"sitemap\.xml"/);
  assert.match(build, /\["index\.html", "dashboard\.html"\]/);
});

test("página de privacidade, indexação e documentação descrevem o fluxo real", () => {
  const html = read("index.html");
  const privacy = read("privacidade.html");
  const robots = read("robots.txt");
  const sitemap = read("sitemap.xml");
  const llms = read("llms.txt");
  const sourceConfig = read("assets/js/config.js");
  const gitignore = read(".gitignore");
  const faq = [...html.matchAll(/<details>/g)];
  assert.match(html, /href="\/privacidade"/);
  assert.equal(faq.length, 5);
  assert.match(privacy, /WhatsApp da Gifts da Raquel/);
  assert.match(privacy, /Supabase/);
  assert.match(robots, /Sitemap: https:\/\/gifts-da-raquel\.onrender\.com\/sitemap\.xml/);
  assert.match(sitemap, /\/privacidade/);
  assert.doesNotMatch(llms, /dados demonstrativos/);
  assert.match(gitignore, /^\.env$/m);
  assert.doesNotMatch(sourceConfig, /sb_publishable_[A-Za-z0-9_-]+/);
});

test("links de seção da loja têm destino e a página permite rolagem vertical", () => {
  const html = read("index.html");
  const styles = read("assets/css/styles.css");
  const deployStyles = read("assets/css/deploy.css");
  const sectionIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
  const sectionLinks = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);

  assert.ok(sectionLinks.length > 0, "a loja deve oferecer navegação para suas seções");
  for (const target of sectionLinks) assert.ok(sectionIds.has(target), `#${target} deve existir`);
  assert.doesNotMatch(styles, /\.storefront\{[^}]*overflow:hidden/);
  assert.match(deployStyles, /\.storefront\s*\{\s*overflow-x:\s*clip/);
});

test("loja pública define layout completo e menu móvel", () => {
  const styles = read("assets/css/styles.css");
  assert.match(styles, /\.store-header\s*\{[^}]*display:\s*flex/);
  assert.match(styles, /\.store-hero\s*\{[^}]*display:\s*grid/);
  assert.match(styles, /\.promo-gallery\s*\{[^}]*grid-template-columns/);
  assert.match(styles, /\.price-card\s*\{/);
  assert.match(styles, /\.faq-list\s*details/);
  assert.match(styles, /nav\[data-open="true"\]\s*\{\s*display:\s*flex/);
  assert.match(styles, /@media\s*\(max-width:\s*360px\)/);
});








