-- Run in Supabase SQL Editor (https://supabase.com/dashboard → SQL → New query)

create table if not exists public.game_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.game_state (id, payload)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.game_state enable row level security;

create policy "Anyone can read game state"
  on public.game_state for select
  using (true);

create policy "Anyone can insert game state"
  on public.game_state for insert
  with check (true);

create policy "Anyone can update game state"
  on public.game_state for update
  using (true);

-- Optional: enable Realtime in Dashboard → Database → Replication → game_state
