create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.workspace_item_kind as enum ('code', 'summary', 'research');
exception when duplicate_object then null;
end $$;

create table if not exists public.workspace_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind public.workspace_item_kind not null default 'summary',
  title text not null check (char_length(title) between 1 and 120),
  language text check (language is null or char_length(language) <= 30),
  content text not null default '' check (char_length(content) <= 50000),
  source_url text check (source_url is null or (char_length(source_url) <= 2000 and source_url ~ '^https?://')),
  tags text[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint code_language_consistency check (kind = 'code' or language is null)
);

create index if not exists workspace_items_owner_updated_idx on public.workspace_items(owner_id, updated_at desc);
create index if not exists workspace_items_owner_kind_idx on public.workspace_items(owner_id, kind);

create or replace function public.set_workspace_item_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspace_items_updated_at on public.workspace_items;
create trigger workspace_items_updated_at before update on public.workspace_items for each row execute function public.set_workspace_item_updated_at();

alter table public.workspace_items enable row level security;
alter table public.workspace_items force row level security;

drop policy if exists "workspace_items_select_own" on public.workspace_items;
create policy "workspace_items_select_own" on public.workspace_items for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "workspace_items_insert_own" on public.workspace_items;
create policy "workspace_items_insert_own" on public.workspace_items for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "workspace_items_update_own" on public.workspace_items;
create policy "workspace_items_update_own" on public.workspace_items for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "workspace_items_delete_own" on public.workspace_items;
create policy "workspace_items_delete_own" on public.workspace_items for delete to authenticated using ((select auth.uid()) = owner_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.workspace_items to authenticated;
