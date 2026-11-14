# Supabase: estado e próximo passo

`202611130001_initial_operations.sql` cria as tabelas operacionais, RLS, bucket privado e RPC para cadastrar pedido pelo painel. `seed.sql` fornece as faixas de preço.

O histórico do projeto registra que o esquema e os preços foram aplicados pelo SQL Editor. Isso precisa ser confirmado no projeto Supabase antes de executar novamente. Como esse método não atualiza o histórico do Supabase CLI, alinhe o histórico de migrations antes de usar `supabase db push`.

A conta do painel só acessa dados quando seu `user_id` está na única vaga de `public.admin_users`. Os registros deste repositório dizem que o convite de Raquel redirecionava para `localhost` e expirou; confirme o usuário e a associação atuais, configure o domínio Render em Authentication → URL Configuration e envie novo convite. A chave `service_role` nunca vai para o navegador.

As migrations `202611130002_fixed_shipping_fee.sql` e `202611130003_allow_unknown_legacy_shipping.sql` mantêm o frete padrão em R$ 10,00 e permitem `NULL` quando um pedido antigo não tem frete confirmado. O site não grava pedidos públicos no Supabase: o cliente finaliza os detalhes pelo WhatsApp.

O bucket privado aceita JPEG, PNG, WebP e HEIC até 15 MiB, mas não existe fluxo de upload nem validação do conteúdo no painel. Fotos continuam sendo combinadas pelo WhatsApp.
