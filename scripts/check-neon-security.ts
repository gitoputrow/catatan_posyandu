import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_POOLED atau DATABASE_URL belum diatur.");
}

const sql = neon(databaseUrl);
const protectedTables = [
  "balita",
  "kelurahan",
  "laporan_gebyar_posyandu",
  "laporan_hasil_kegiatan_bulanan",
  "laporan_kehadiran_posyandu",
  "laporan_kegiatan_posyandu",
  "petugas",
  "posyandu",
  "tumbuh_kembang_balita",
] as const;

type RoleRow = {
  rolbypassrls: boolean;
  rolcanlogin: boolean;
  rolname: string;
  rolsuper: boolean;
};

type TableRow = {
  relforcerowsecurity: boolean;
  relname: string;
  relrowsecurity: boolean;
};

type PolicyRow = {
  command: string;
  policy_count: number;
  table_name: string;
};

type ActorRow = {
  auth_user_id: string;
  jenis_petugas: string;
  posyandu_id: string;
};

type AccessResult = {
  can_write: boolean;
  role: string;
  visible_children: number;
};

const roles = (await sql`
  select rolname, rolsuper, rolbypassrls, rolcanlogin
  from pg_roles
  where rolname = 'app_runtime'
`) as RoleRow[];
const runtimeRole = roles[0];

if (!runtimeRole) throw new Error("Role app_runtime belum tersedia.");
if (runtimeRole.rolsuper || runtimeRole.rolbypassrls || runtimeRole.rolcanlogin) {
  throw new Error("Role app_runtime memiliki atribut yang terlalu luas.");
}

const tableRows = (await sql.query(
  `select c.relname, c.relrowsecurity, c.relforcerowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any($1::text[])
   order by c.relname`,
  [protectedTables],
)) as TableRow[];

const unprotectedTables = protectedTables.filter((tableName) => {
  const table = tableRows.find(({ relname }) => relname === tableName);
  return !table?.relrowsecurity || !table.relforcerowsecurity;
});

if (unprotectedTables.length > 0) {
  throw new Error(`RLS belum lengkap pada: ${unprotectedTables.join(", ")}.`);
}

const policyRows = (await sql.query(
  `select tablename as table_name, cmd as command, count(*)::int as policy_count
   from pg_policies
   where schemaname = 'public'
     and tablename = any($1::text[])
     and 'app_runtime' = any(roles)
   group by tablename, cmd
   order by tablename, cmd`,
  [protectedTables],
)) as PolicyRow[];

const actors = (await sql`
  select distinct on (lower(trim(jenis_petugas)))
    auth_user_id::text,
    jenis_petugas,
    posyandu_id::text
  from public.petugas
  where is_active = true
    and auth_user_id is not null
    and lower(trim(jenis_petugas)) in ('kader', 'viewer')
  order by lower(trim(jenis_petugas)), id
`) as ActorRow[];

async function checkAccess(authUserId: string | null, posyanduId: string | null) {
  const results = await sql.transaction((transaction) => [
    transaction`select set_config('app.auth_user_id', ${authUserId ?? ""}, true)`,
    transaction.query("set local role app_runtime"),
    transaction.query(
      `select
         current_user as role,
         count(*)::int as visible_children,
         app_security.can_write_posyandu($1::uuid) as can_write
       from public.balita`,
      [posyanduId],
    ),
  ]);

  return (results[2] as AccessResult[])[0];
}

const kader = actors.find(({ jenis_petugas }) => jenis_petugas.trim().toLowerCase() === "kader");
const viewer = actors.find(({ jenis_petugas }) => jenis_petugas.trim().toLowerCase() === "viewer");

if (!kader || !viewer) {
  throw new Error("Petugas aktif dengan role kader dan viewer diperlukan untuk menguji policy.");
}

const [kaderAccess, viewerAccess, anonymousAccess] = await Promise.all([
  checkAccess(kader.auth_user_id, kader.posyandu_id),
  checkAccess(viewer.auth_user_id, viewer.posyandu_id),
  checkAccess(null, null),
]);

if (kaderAccess.role !== "app_runtime" || !kaderAccess.can_write) {
  throw new Error("Policy kader tidak memberikan akses tulis yang semestinya.");
}
if (viewerAccess.role !== "app_runtime" || viewerAccess.can_write) {
  throw new Error("Policy viewer masih memberikan akses tulis.");
}
if (anonymousAccess.visible_children !== 0 || anonymousAccess.can_write) {
  throw new Error("Request tanpa sesi masih dapat mengakses data tenant.");
}

console.log(`FORCE RLS aktif pada ${tableRows.length} tabel aplikasi.`);
console.log(`Ditemukan ${policyRows.reduce((total, row) => total + row.policy_count, 0)} policy app_runtime.`);
console.log(
  JSON.stringify(
    {
      kader: kaderAccess,
      viewer: viewerAccess,
      anonymous: anonymousAccess,
    },
    null,
    2,
  ),
);
