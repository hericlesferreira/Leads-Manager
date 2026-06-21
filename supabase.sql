create table if not exists public.leads_store (
  id text primary key,
  data jsonb not null default '{"months": {}}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.leads_store enable row level security;

-- Nao crie policies publicas para esta tabela.
-- A aplicacao online acessa os dados somente pela API da Vercel,
-- usando SUPABASE_SERVICE_ROLE_KEY guardada como variavel de ambiente.
insert into public.leads_store (id, data)
values ('default', '{"months": {}}'::jsonb)
on conflict (id) do nothing;
