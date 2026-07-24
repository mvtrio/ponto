-- Configurações da empresa (single-tenant): jornada padrão usada no cálculo do banco de horas.

create table public.company_settings (
  id int primary key default 1 check (id = 1),
  standard_daily_minutes int not null default 480,
  tolerance_minutes int not null default 5,
  work_week_days int[] not null default '{1,2,3,4,5}',
  updated_at timestamptz not null default now()
);

comment on table public.company_settings is 'Linha única com a configuração de jornada padrão da empresa.';

insert into public.company_settings (id) values (1);
