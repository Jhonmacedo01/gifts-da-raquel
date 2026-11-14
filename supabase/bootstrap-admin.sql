-- Execute uma única vez no SQL Editor após:
-- 1) aplicar as migrations; 2) convidar/criar a conta de Raquel em Authentication > Users.
-- Substitua o e-mail abaixo pelo endereço exato da conta. A transação falha se não
-- encontrar exatamente uma conta ou se já existir uma administradora.
do $$
declare
  raquel_email constant text := lower('raquelalmeida1717@gmail.com');
  raquel_id uuid;
begin
  if exists (select 1 from public.admin_users) then
    raise exception 'Já existe uma administradora; a associação não foi alterada.';
  end if;

  select id into raquel_id
  from auth.users
  where lower(email) = raquel_email;

  if raquel_id is null then
    raise exception 'Não foi encontrada uma conta Auth com o e-mail informado.';
  end if;

  insert into public.admin_users (user_id, display_name)
  values (raquel_id, 'Raquel');
end;
$$;

