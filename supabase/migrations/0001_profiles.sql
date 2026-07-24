-- Perfis de usuário (1:1 com auth.users), incluindo papel (employee/admin).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'employee' check (role in ('employee', 'admin')),
  employee_code text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de cada usuário autenticado, com papel employee/admin.';

-- Cria automaticamente um profile (employee) para todo novo usuário do Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'employee');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
