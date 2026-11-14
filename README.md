# Gifts da Raquel

Loja online de ímãs fotográficos personalizados. O site apresenta os produtos e preços, calcula uma estimativa e encaminha o cliente à Raquel pelo WhatsApp. Um painel administrativo privado permite acompanhar e cadastrar pedidos.

## O que o projeto oferece

- Loja responsiva para ímãs de foto de 6 × 6 cm, com catálogo, preços e dúvidas frequentes.
- Estimativa de pedido e atendimento pelo WhatsApp. O site não confirma encomendas nem recebe pagamentos.
- Login administrativo com Supabase Auth. O cadastro público fica desativado, e o dashboard só libera contas associadas em `public.admin_users`.
- Painel com indicadores, consulta dos 100 pedidos mais recentes e cadastro de pedido.
- Política de privacidade e arquivos de `robots.txt` e sitemap.

Agenda, estoque, clientes e financeiro ainda não têm fluxos operacionais no painel. O site também não oferece checkout, pagamento online ou envio de fotos.

## Tecnologias

- HTML, CSS e JavaScript no navegador.
- Node.js para gerar o site estático em `dist/` e servir a versão local.
- Supabase para autenticação, banco de dados, Row Level Security (RLS) e armazenamento privado.
- Render Static Site como destino principal de publicação. Há também configurações para Netlify e Vercel.

## Executar localmente

Requer Node.js 18 ou superior. Não há dependências npm de produção.

1. Copie `.env.example` para `.env`.
2. Preencha `SUPABASE_PUBLISHABLE_KEY` com a chave publishable do projeto. O endereço Supabase já consta no exemplo.
3. Inicie o servidor:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edite .env e preencha SUPABASE_PUBLISHABLE_KEY.
npm run dev
```

Abra `http://localhost:3000`. O comando `npm run dev` gera o build e inicia o servidor. Para gerar somente os arquivos estáticos, use `npm run build`; a saída fica em `dist/`.
O build para com erro se faltar uma página, script, estilo ou imagem essencial. As URLs dos CSS recebem um hash do conteúdo para o navegador buscar a versão atualizada após mudanças.

O `.env` é local e ignorado pelo Git. A chave publishable é entregue ao navegador e não substitui as políticas RLS. Nunca coloque uma chave `service_role` no site ou no `.env` usado pelo build do cliente.

## Supabase

Configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no `.env` local e nas variáveis de ambiente de build do Render. O build cria `dist/assets/js/config.js` com esses valores. Em um Static Site já existente no Render, salve as variáveis no serviço e faça um novo build e deploy.

Antes de ativar o login:

1. Configure o Site URL e as Redirect URLs do Supabase para os domínios de produção e desenvolvimento local.
2. Crie ou convide a conta administrativa em Authentication.
3. Associe a conta autorizada em `public.admin_users` usando o procedimento documentado em [`supabase/bootstrap-admin.sql`](supabase/bootstrap-admin.sql).
4. Confirme as migrations e os dados de preço no projeto. O histórico informa que a migration inicial e o seed foram aplicados manualmente pelo SQL Editor; confira o estado atual antes de reaplicar. Consulte [`docs/primeira-migracao.md`](docs/primeira-migracao.md).

As migrations numeradas definem o esquema operacional e as regras de frete. Novos pedidos usam frete de R$ 10,00; registros antigos podem manter o frete como `NULL` quando o valor não é conhecido.

## Publicação no Render

O arquivo [`render.yaml`](render.yaml) define o Blueprint do site estático:

- Build: `npm run build`
- Diretório publicado: `dist/`
- Rotas amigáveis: `/login`, `/privacidade` e `/admin/dashboard`
- Cabeçalhos de segurança e cache
- Variáveis de build Supabase, que devem ser preenchidas no painel do Render

Domínio previsto para o projeto: <https://gifts-da-raquel.onrender.com>. Confirme no Render que o serviço está publicado e acessível. Consulte [`docs/deploy-checklist.md`](docs/deploy-checklist.md) para conferir as etapas operacionais e autenticação antes de usar o dashboard.

## Verificações

```bash
npm test
```

Os testes cobrem regras de preço e frete, rotas, configuração de deploy e limites documentados. Eles não fazem login no Supabase nem validam serviços publicados.

## Estrutura

```text
assets/       estilos, scripts, biblioteca Supabase e imagens da marca
docs/         escopo, deploy, migrações e validação operacional
supabase/     migrations, seed de preços e bootstrap da conta admin
tests/        testes automatizados
index.html    loja pública
login.html    login administrativo
dashboard.html painel protegido
privacidade.html política de privacidade
build.js      geração dos arquivos estáticos
server.js     servidor local para desenvolvimento
render.yaml   configuração do Render
```

## Limites atuais

- O pedido público é combinado pelo WhatsApp; não é gravado no banco pelo site.
- O dashboard consulta até 100 pedidos recentes e permite cadastrar pedidos. Não oferece edição, paginação ou alteração de status.
- Agenda, estoque, clientes e financeiro estão indisponíveis na interface.
- Pagamentos são registrados manualmente; não há gateway ou baixa automática.
- O bucket de fotos é privado e restringe tipos e tamanho, mas não há upload nem validação de arquivo no dashboard.
- Prazos de produção e entrega são combinados manualmente; não há calendário de feriados ou automações.
