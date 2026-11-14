const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "dist");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8" };
const routes = { "/": "index.html", "/login": "login.html", "/privacidade": "privacidade.html", "/admin": "dashboard.html", "/admin/dashboard": "dashboard.html" };

http.createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405, { Allow: "GET, HEAD" }).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400).end("Requisição inválida"); return; }
  const relative = routes[pathname] || pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, "index.html")) { response.writeHead(403).end("Acesso negado"); return; }
  fs.readFile(file, (error, content) => {
    if (error) { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Página não encontrada"); return; }
    const headers = {
      "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://hbjckqpqewyyejkfzowg.supabase.co wss://hbjckqpqewyyejkfzowg.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      "Cache-Control": path.extname(file).toLowerCase() === ".html" ? "no-cache" : "public, max-age=86400",
    };
    response.writeHead(200, headers);
    response.end(request.method === "HEAD" ? undefined : content);
  });
}).listen(process.env.PORT || 3000, () => console.log(`Gifts da Raquel disponível em http://localhost:${process.env.PORT || 3000}`));

