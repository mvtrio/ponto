-- Seed de desenvolvimento. Rode `supabase db reset` (local) para aplicar migrations + este
-- seed, ou cole no SQL Editor de um projeto hospedado.
--
-- Cria usuários de teste diretamente em auth.users + auth.identities (o trigger
-- on_auth_user_created gera o profile correspondente); depois promove um deles a admin.
-- As colunas de token do GoTrue são preenchidas com '' (não NULL) e a linha em
-- auth.identities é obrigatória para o login funcionar — sem ela o GoTrue retorna
-- "Database error querying schema" ao tentar autenticar.
--
-- Senha de todos: "password123" (apenas para ambiente local de desenvolvimento).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'admin@ponto.dev', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Dev"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'funcionario1@ponto.dev', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Funcionário Um"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'funcionario2@ponto.dev', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Funcionário Dois"}', now(), now(),
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@ponto.dev"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"funcionario1@ponto.dev"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"funcionario2@ponto.dev"}', 'email', now(), now(), now())
on conflict do nothing;

update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111';

-- Alguns punches de exemplo para o Funcionário Um: ontem, jornada completa com almoço.
insert into public.punches (employee_id, type, occurred_at, source)
values
  ('22222222-2222-2222-2222-222222222222', 'clock_in', (current_date - 1) + time '08:00', 'mobile'),
  ('22222222-2222-2222-2222-222222222222', 'break_start', (current_date - 1) + time '12:00', 'mobile'),
  ('22222222-2222-2222-2222-222222222222', 'break_end', (current_date - 1) + time '13:00', 'mobile'),
  ('22222222-2222-2222-2222-222222222222', 'clock_out', (current_date - 1) + time '17:00', 'mobile');
