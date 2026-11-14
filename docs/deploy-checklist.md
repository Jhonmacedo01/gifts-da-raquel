# Checklist de publicação

## Preparado no código

- Loja, login e painel servidos como site estático pelo Render.
- Rotas `/login`, `/privacidade`, `/admin` e `/admin/dashboard` configuradas em `render.yaml`.
- Configuração do Supabase gerada durante o build a partir de `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`; `.env` está ignorado pelo Git.
- Frete padrão de R$ 10,00 para pedidos novos e `NULL` permitido para registros antigos sem valor confirmado.
- Política de privacidade, `robots.txt` e `sitemap.xml` publicados.

## Ainda precisa ser confirmado no serviço

1. No Static Site do Render, definir `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` em **Settings → Environment** e selecionar **Save, rebuild, and deploy**. `sync: false` não preenche variáveis novas em sincronizações posteriores de um Blueprint existente.
2. No Supabase, conferir se as migrations `202611130002_fixed_shipping_fee.sql` e `202611130003_allow_unknown_legacy_shipping.sql` foram aplicadas. A aplicação anterior no SQL Editor não registra automaticamente o histórico do CLI.
3. Confirmar que `https://gifts-da-raquel.onrender.com` está em Authentication → URL Configuration como Site URL e Redirect URL.
4. Confirmar o vínculo da conta de Raquel em `public.admin_users`, manter sign-ups públicos desativados e enviar um convite que ela consiga aceitar.
5. Testar a loja e a política em tela de 375 px; entrar no painel com a conta de Raquel; criar e consultar um pedido de teste; verificar os cabeçalhos e o cálculo do frete no serviço publicado.
6. Definir rotina de backup e retenção antes de guardar mais dados reais.

O estimador público encaminha o resumo para o WhatsApp; não cria pedido no banco nem recebe pagamento. O painel atual oferece visão geral e cadastro/lista dos pedidos recentes; agenda, estoque, clientes e financeiro ainda estão em preparação.
