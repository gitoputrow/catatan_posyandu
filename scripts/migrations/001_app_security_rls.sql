do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
end
$$;
-- statement-breakpoint
grant app_runtime to neondb_owner;
-- statement-breakpoint
create schema if not exists app_security authorization neondb_owner;
-- statement-breakpoint
revoke all on schema app_security from public;
-- statement-breakpoint
create or replace function app_security.current_auth_user_id()
returns uuid
language sql
stable
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.auth_user_id', true), '')::uuid
$$;
-- statement-breakpoint
create or replace function app_security.can_access_posyandu(target_posyandu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.petugas actor
    where actor.auth_user_id = app_security.current_auth_user_id()
      and actor.is_active = true
      and actor.posyandu_id = target_posyandu_id
  )
$$;
-- statement-breakpoint
create or replace function app_security.can_write_posyandu(target_posyandu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.petugas actor
    where actor.auth_user_id = app_security.current_auth_user_id()
      and actor.is_active = true
      and actor.posyandu_id = target_posyandu_id
      and lower(trim(actor.jenis_petugas)) = 'kader'
  )
$$;
-- statement-breakpoint
create or replace function app_security.can_insert_for_posyandu(
  target_posyandu_id uuid,
  target_created_by uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.petugas actor
    where actor.auth_user_id = app_security.current_auth_user_id()
      and actor.is_active = true
      and actor.posyandu_id = target_posyandu_id
      and actor.id = target_created_by
      and lower(trim(actor.jenis_petugas)) = 'kader'
  )
$$;
-- statement-breakpoint
create or replace function app_security.can_access_kelurahan(target_kelurahan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.petugas actor
    where actor.auth_user_id = app_security.current_auth_user_id()
      and actor.is_active = true
      and actor.kelurahan_id = target_kelurahan_id
  )
$$;
-- statement-breakpoint
create or replace function app_security.preserve_tenant_metadata()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.posyandu_id is distinct from old.posyandu_id then
    raise exception 'posyandu_id tidak dapat diubah' using errcode = '42501';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'created_by tidak dapat diubah' using errcode = '42501';
  end if;

  return new;
end
$$;
-- statement-breakpoint
revoke all on all functions in schema app_security from public;
-- statement-breakpoint
grant usage on schema app_security to app_runtime;
-- statement-breakpoint
grant execute on all functions in schema app_security to app_runtime;
-- statement-breakpoint
revoke all on all tables in schema public from app_runtime;
-- statement-breakpoint
grant select on public.kelurahan, public.posyandu to app_runtime;
-- statement-breakpoint
grant select (
  id, auth_user_id, posyandu_id, kelurahan_id, nama, jenis_petugas,
  is_active, nama_kelurahan, nama_posyandu, jenis_kelamin
) on public.petugas to app_runtime;
-- statement-breakpoint
grant select, insert, update, delete on
  public.balita,
  public.tumbuh_kembang_balita,
  public.laporan_kehadiran_posyandu,
  public.laporan_kegiatan_posyandu,
  public.laporan_hasil_kegiatan_bulanan,
  public.laporan_gebyar_posyandu
to app_runtime;
-- statement-breakpoint
do $$
declare
  target_table text;
  tenant_tables text[] := array[
    'balita',
    'tumbuh_kembang_balita',
    'laporan_kehadiran_posyandu',
    'laporan_kegiatan_posyandu',
    'laporan_hasil_kegiatan_bulanan',
    'laporan_gebyar_posyandu'
  ];
begin
  foreach target_table in array tenant_tables loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);

    execute format('drop policy if exists app_runtime_select on public.%I', target_table);
    execute format(
      'create policy app_runtime_select on public.%I for select to app_runtime using (app_security.can_access_posyandu(posyandu_id))',
      target_table
    );

    execute format('drop policy if exists app_runtime_insert on public.%I', target_table);
    execute format(
      'create policy app_runtime_insert on public.%I for insert to app_runtime with check (app_security.can_insert_for_posyandu(posyandu_id, created_by))',
      target_table
    );

    execute format('drop policy if exists app_runtime_update on public.%I', target_table);
    execute format(
      'create policy app_runtime_update on public.%I for update to app_runtime using (app_security.can_write_posyandu(posyandu_id)) with check (app_security.can_write_posyandu(posyandu_id))',
      target_table
    );

    execute format('drop policy if exists app_runtime_delete on public.%I', target_table);
    execute format(
      'create policy app_runtime_delete on public.%I for delete to app_runtime using (app_security.can_write_posyandu(posyandu_id))',
      target_table
    );

    execute format('drop trigger if exists protect_tenant_metadata on public.%I', target_table);
    execute format(
      'create trigger protect_tenant_metadata before update of posyandu_id, created_by on public.%I for each row execute function app_security.preserve_tenant_metadata()',
      target_table
    );
  end loop;
end
$$;
-- statement-breakpoint
alter table public.petugas enable row level security;
-- statement-breakpoint
alter table public.petugas force row level security;
-- statement-breakpoint
drop policy if exists app_runtime_select on public.petugas;
-- statement-breakpoint
create policy app_runtime_select
on public.petugas
for select
to app_runtime
using (app_security.can_access_posyandu(posyandu_id));
-- statement-breakpoint
alter table public.posyandu enable row level security;
-- statement-breakpoint
alter table public.posyandu force row level security;
-- statement-breakpoint
drop policy if exists app_runtime_select on public.posyandu;
-- statement-breakpoint
create policy app_runtime_select
on public.posyandu
for select
to app_runtime
using (app_security.can_access_posyandu(id));
-- statement-breakpoint
alter table public.kelurahan enable row level security;
-- statement-breakpoint
alter table public.kelurahan force row level security;
-- statement-breakpoint
drop policy if exists app_runtime_select on public.kelurahan;
-- statement-breakpoint
create policy app_runtime_select
on public.kelurahan
for select
to app_runtime
using (app_security.can_access_kelurahan(id));
