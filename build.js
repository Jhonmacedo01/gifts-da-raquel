const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const project = __dirname;
const output = path.join(project, "dist");

function loadLocalEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const entry = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!entry || process.env[entry[1]] !== undefined) continue;
    const value = entry[2];
    process.env[entry[1]] = value.length >= 2 && value[0] === value.at(-1) && ["'", '"'].includes(value[0])
      ? value.slice(1, -1)
      : value;
  }
}

loadLocalEnv(path.join(project, ".env"));
const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseKey = (process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();

if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) {
  throw new Error("Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY juntos.");
}

const requiredFiles = [
  "index.html", "login.html", "dashboard.html", "privacidade.html",
  "robots.txt", "sitemap.xml", "llms.txt", "_headers",
  "assets/css/styles.css", "assets/css/deploy.css", "assets/js/store.mjs",
  "assets/js/order-pricing.mjs", "assets/images/brand/logo-gifts-da-raquel.jpg",
];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(project, file))) {
    throw new Error(`Arquivo obrigatório ausente no build: ${file}`);
  }
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

// Função segura para copiar arquivos (não quebra se o arquivo não existir)
function safeCopy(source, destination) {
  const sourcePath = path.join(project, source);
  if (fs.existsSync(sourcePath)) {
    const destPath = path.join(output, destination);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(sourcePath, destPath);
  } else {
    console.warn(`⚠️ Aviso: Arquivo ${source} não encontrado, pulando...`);
  }
}

// Copiar arquivos estáticos
for (const file of ["index.html", "login.html", "dashboard.html", "privacidade.html", "robots.txt", "sitemap.xml", "llms.txt", "_headers"]) {
  safeCopy(file, file);
}

// Rotas do Admin
safeCopy("dashboard.html", "admin.html");
safeCopy("dashboard.html", "admin/index.html");
safeCopy("dashboard.html", "admin/dashboard.html");

// Copiar Assets
const assetsFolder = path.join(project, "assets");
if (fs.existsSync(assetsFolder)) {
  fs.cpSync(assetsFolder, path.join(output, "assets"), { recursive: true });
  console.log("✅ Pasta assets copiada.");
} else {
  console.error("❌ ERRO FATAL: A pasta 'assets' não foi encontrada na raiz!");
}

// Gerar config do Supabase
const configDir = path.join(output, "assets/js");
fs.mkdirSync(configDir, { recursive: true });
fs.writeFileSync(path.join(configDir, "config.js"), [
  `export const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};`,
  `export const SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(supabaseKey)};`,
  "export const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);",
  "",
].join("\n"));

// Hashes change only when CSS changes, avoiding stale unstyled pages after a deploy.
for (const page of ["index.html", "login.html", "dashboard.html", "privacidade.html", "admin.html", "admin/index.html", "admin/dashboard.html"]) {
  const file = path.join(output, page);
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, "utf8");
    for (const css of ["styles.css", "deploy.css"]) {
      const cssPath = path.join(output, "assets/css", css);
      if (fs.existsSync(cssPath)) {
         const hash = crypto.createHash("sha256").update(fs.readFileSync(cssPath)).digest("hex").slice(0, 12);
         html = html.replaceAll(`/assets/css/${css}`, `/assets/css/${css}?v=${hash}`);
      }
    }
    fs.writeFileSync(file, html);
  }
}

console.log("🚀 Build finalizado com sucesso!");
