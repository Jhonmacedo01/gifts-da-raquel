# Verificação dos limites operacionais

`npm test` confere o cálculo de preço/frete, links da loja, acesso administrativo no código, configuração do Render e os limites abaixo. Não faz pedidos ou autenticação em serviços reais.

| Área | Estado no código | O que ainda depende de operação manual |
| --- | --- | --- |
| Preços | As faixas publicadas são calculadas no site. | Quantidades fora das faixas precisam de orçamento pelo WhatsApp. O site e a tabela do Supabase precisam continuar sincronizados quando os preços mudarem. |
| Frete | R$ 10,00 é o padrão para novos pedidos; migrations 002 e 003 permitem `NULL` quando pedido antigo não tem valor conhecido. | Confirmar que ambas foram aplicadas no projeto Supabase. |
| Pedido público | O formulário monta uma mensagem com estimativa e abre o WhatsApp. | O site não grava o pedido, não confirma a encomenda e não recebe pagamento. |
| Painel | Visão geral, até 100 pedidos recentes e criação de pedido via RPC. Só Raquel deve estar associada em `admin_users`. | Confirmar as variáveis de build, associação de Raquel, URL de Auth e convite no Supabase. Não há paginação nem edição de pedido. |
| Agenda, estoque, clientes e financeiro | Banco tem parte do esquema, mas os módulos de interface estão desativados. | Implementar e verificar cada fluxo antes de habilitar no menu. |
| Pagamentos | Esquema suporta registros de pagamento. | Não há gateway, checkout nem baixa automática. |
| Fotos | Bucket privado permite JPEG, PNG, WebP e HEIC até 15 MiB. | Não há upload, validação real do arquivo ou política automatizada de retenção no painel. Fotos são combinadas via WhatsApp. |
| Prazo e produção | O texto informa 7 a 12 dias úteis após aprovação das fotos e pagamento. | O prazo é combinado manualmente; não há calendário de feriados ou automações. |
| Privacidade | A página informa os dados usados, fornecedores e canal de solicitações. | Confirmar que os processos e prazos descritos correspondem à operação real e rever o texto se os fornecedores ou o fluxo mudarem. |

Antes de usar com clientes, testar a URL publicada, o login de Raquel, o cadastro de um pedido de teste, o frete armazenado e os cabeçalhos do Render. Faça isso com dados de teste e depois remova-os.