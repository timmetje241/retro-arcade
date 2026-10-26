-- Tabel voor de gedeelde highscores. Plak dit in Supabase onder "SQL Editor" en klik op "Run".

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  spel text not null check (spel ~ '^[a-z0-9-]{1,30}$'),
  naam text not null check (char_length(naam) between 1 and 12),
  score integer not null check (score between 1 and 10000000),
  gemaakt timestamptz not null default now()
);

create index if not exists scores_per_spel on public.scores (spel, score desc);

-- Iedereen mag scores lezen en toevoegen, maar niemand mag ze aanpassen of verwijderen.
alter table public.scores enable row level security;

create policy "iedereen mag scores lezen"
  on public.scores for select
  to anon
  using (true);

create policy "iedereen mag een score toevoegen"
  on public.scores for insert
  to anon
  with check (true);
