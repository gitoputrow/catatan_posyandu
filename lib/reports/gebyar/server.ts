import "server-only";

import type { GebyarReport, SavedGebyarReport } from "@/components/reports/gebyar/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { databaseResult, insertRow, queryOne, queryRows, updateRow } from "@/lib/neon/query";
import { getAuthenticatedPetugas, getAuthenticatedPetugasForWrite } from "@/lib/user/server";

const tableName = "laporan_gebyar_posyandu";

export type GebyarReportInput = Omit<SavedGebyarReport, "id">;

type PosyanduRow = {
  alamat: string | null;
  nama_kecamatan: string | null;
  nama_kota: string | null;
  nama_kelurahan: string | null;
  nama_posyandu: string | null;
  rt: string | null;
  rw: string | null;
};

type AttendanceRow = {
  id_petugas: string[] | null;
  total_ibu_hamil: number | null;
};

type CadreRow = {
  id: string;
  nama: string | null;
};

type ActivityRow = {
  balita_kmsk: boolean | null;
  dapat_vit_a: boolean | null;
  periksa_bumil: boolean | null;
  imunisasi_tt_1: boolean | null;
  imunisasi_tt_2: boolean | null;
  total_bcg_l: number | null;
  total_bcg_p: number | null;
  total_balita_diare_l: number | null;
  total_balita_diare_p: number | null;
  total_campak_l: number | null;
  total_campak_p: number | null;
  total_dpt_1_l: number | null;
  total_dpt_1_p: number | null;
  total_dpt_2_l: number | null;
  total_dpt_2_p: number | null;
  total_dpt_3_l: number | null;
  total_dpt_3_p: number | null;
  total_hepatitis_b_1_l: number | null;
  total_hepatitis_b_1_p: number | null;
  total_hepatitis_b_2_l: number | null;
  total_hepatitis_b_2_p: number | null;
  total_hepatitis_b_3_l: number | null;
  total_hepatitis_b_3_p: number | null;
  total_kb_implant: number | null;
  total_kb_iud: number | null;
  total_kb_kondom: number | null;
  total_kb_mop: number | null;
  total_kb_mow: number | null;
  total_kb_pil: number | null;
  total_kb_suntik: number | null;
  total_oralit_l: number | null;
  total_oralit_p: number | null;
  total_polio_1_l: number | null;
  total_polio_1_p: number | null;
  total_polio_2_l: number | null;
  total_polio_2_p: number | null;
  total_polio_3_l: number | null;
  total_polio_3_p: number | null;
  total_polio_4_l: number | null;
  total_polio_4_p: number | null;
};

type NutritionChild = { id: string };

type NutritionMeasurement = {
  balita_id: string;
  berat_badan: number | string | null;
  periode_bulan: string;
};

type GebyarReportRow = SavedGebyarReport & {
  dana_sehat_total_keluarga_sasaran: number | null;
  dana_sehat_total_sumbangan: number | null;
  mitra_total_bumn_bumd: number | null;
  mitra_total_kantor_dinas: number | null;
  mitra_total_lsm_lsom: number | null;
  mitra_total_perusahaan: number | null;
  pemberian_tambahan_makanan: boolean | null;
  program_tambahan_total_bkb: number | null;
  program_tambahan_total_gsi: number | null;
  program_tambahan_total_lainnya: number | null;
  program_tambahan_total_paud: number | null;
  program_tambahan_total_ppks: number | null;
  program_tambahan_total_psn: number | null;
};

export async function getGebyarReport(month: number, year: number): Promise<GebyarReport> {
  const { posyanduId } = await getAuthenticatedPetugas();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextPeriod = new Date(Date.UTC(year, month, 1));
  const monthEnd = `${nextPeriod.getUTCFullYear()}-${String(nextPeriod.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const [posyandu, cadres, attendance, activity, nutrition, gebyar] = await Promise.all([
    queryOne<PosyanduRow>("select nama_posyandu, alamat, rt, rw, nama_kelurahan, nama_kecamatan, nama_kota from posyandu where id = $1", [posyanduId]),
    queryRows<CadreRow>("select id, nama from petugas where posyandu_id = $1 and lower(jenis_petugas) = 'kader' and is_active = true order by nama", [posyanduId]),
    queryOne<AttendanceRow>(`select id_petugas, total_ibu_hamil from laporan_kehadiran_posyandu where posyandu_id = $1
      and periode >= $2::date and periode < $3::date order by created_at desc nulls last limit 1`, [posyanduId, monthStart, monthEnd]),
    queryOne<ActivityRow>(`select * from laporan_kegiatan_posyandu where posyandu_id = $1
      and periode >= $2::date and periode < $3::date order by created_at desc limit 1`, [posyanduId, monthStart, monthEnd]),
    getNutritionSummary(posyanduId, month, year),
    queryOne<GebyarReportRow>(`select * from laporan_gebyar_posyandu where posyandu_id = $1
      and periode >= $2::timestamptz and periode < $3::timestamptz order by created_at desc limit 1`, [posyanduId, monthStart, monthEnd]),
  ]);

  if (!posyandu) throw new Error("Data Posyandu tidak ditemukan.");
  const totalPregnantWomen = attendance?.total_ibu_hamil ?? 0;
  const servedParticipants = activity ? {
    condom: activity.total_kb_kondom ?? 0,
    implant: activity.total_kb_implant ?? 0,
    injection: activity.total_kb_suntik ?? 0,
    iud: activity.total_kb_iud ?? 0,
    pill: activity.total_kb_pil ?? 0,
    sterilization: (activity.total_kb_mop ?? 0) + (activity.total_kb_mow ?? 0),
  } : null;
  const targetFamilies = gebyar?.dana_sehat_total_keluarga_sasaran ?? null;
  const contributingFamilies = gebyar?.dana_sehat_total_sumbangan ?? null;
  const cadreIds = new Set(cadres.map((cadre) => cadre.id));
  const presentCadres = new Set(
    (attendance?.id_petugas ?? []).filter((officerId) => cadreIds.has(officerId)),
  ).size;

  return {
    cadres: cadres.map((cadre) => ({ id: cadre.id, name: cadre.nama ?? "-" })),
    month,
    year,
    savedReport: gebyar,
    additionalPrograms: {
      bkb: gebyar?.program_tambahan_total_bkb ?? null,
      elderlyDevelopment: null,
      gsi: gebyar?.program_tambahan_total_gsi ?? null,
      other: gebyar?.program_tambahan_total_lainnya ?? null,
      paud: gebyar?.program_tambahan_total_paud ?? null,
      ppks: gebyar?.program_tambahan_total_ppks ?? null,
      psn: gebyar?.program_tambahan_total_psn ?? null,
    },
    supplementaryFeeding: gebyar?.pemberian_tambahan_makanan ?? null,
    diarrheaPrevention: {
      childrenGivenOralit: sumGender(activity, "total_oralit_l", "total_oralit_p"),
      childrenSuspectedDiarrhea: sumGender(activity, "total_balita_diare_l", "total_balita_diare_p"),
    },
    familyPlanning: {
      coachedCouplesOfReproductiveAge: gebyar?.total_pus_binaan ?? null,
      coachedParticipants: gebyar?.total_kb_binaan ?? null,
      servedParticipants: servedParticipants ? {
        ...servedParticipants,
        total: gebyar?.total_kb_dilayani ?? 0,
      } : gebyar?.total_kb_dilayani === null || gebyar?.total_kb_dilayani === undefined
        ? null
        : {
            condom: 0, implant: 0, injection: 0, iud: 0, pill: 0, sterilization: 0,
            total: gebyar.total_kb_dilayani,
          },
    },
    healthyFund: {
      contributingFamilies,
      targetFamilies,
      total: targetFamilies === null && contributingFamilies === null
        ? null
        : (targetFamilies ?? 0) + (contributingFamilies ?? 0),
    },
    healthOfMotherAndChild: {
      pregnantWomenExamined: activity?.periksa_bumil === true
        ? totalPregnantWomen
        : activity?.periksa_bumil === false
          ? 0
          : null,
      totalPregnantWomen,
      vitaminAProvided: activity?.dapat_vit_a ?? null,
    },
    immunization: {
      bcg: sumGender(activity, "total_bcg_l", "total_bcg_p"),
      campak: sumGender(activity, "total_campak_l", "total_campak_p"),
      dpt1: sumGender(activity, "total_dpt_1_l", "total_dpt_1_p"),
      dpt2: sumGender(activity, "total_dpt_2_l", "total_dpt_2_p"),
      dpt3: sumGender(activity, "total_dpt_3_l", "total_dpt_3_p"),
      hepatitis1: sumGender(activity, "total_hepatitis_b_1_l", "total_hepatitis_b_1_p"),
      hepatitis2: sumGender(activity, "total_hepatitis_b_2_l", "total_hepatitis_b_2_p"),
      hepatitis3: sumGender(activity, "total_hepatitis_b_3_l", "total_hepatitis_b_3_p"),
      polio1: sumGender(activity, "total_polio_1_l", "total_polio_1_p"),
      polio2: sumGender(activity, "total_polio_2_l", "total_polio_2_p"),
      polio3: sumGender(activity, "total_polio_3_l", "total_polio_3_p"),
      polio4: sumGender(activity, "total_polio_4_l", "total_polio_4_p"),
      pregnantWomenTt1: conditionalTotal(activity?.imunisasi_tt_1, totalPregnantWomen),
      pregnantWomenTt2: conditionalTotal(activity?.imunisasi_tt_2, totalPregnantWomen),
    },
    involvedPartners: {
      bumnOrBumd: gebyar?.mitra_total_bumn_bumd ?? null,
      company: gebyar?.mitra_total_perusahaan ?? null,
      governmentOffice: gebyar?.mitra_total_kantor_dinas ?? null,
      lsmOrLsom: gebyar?.mitra_total_lsm_lsom ?? null,
    },
    nutrition: {
      ...nutrition,
      belowRedLine: null,
      hasKms: activity?.balita_kmsk === true
        ? nutrition.totalChildren
        : activity?.balita_kmsk === false
          ? 0
          : null,
    },
    identity: {
      address: formatAddress(posyandu),
      cityOrRegency: posyandu.nama_kota,
      districtName: posyandu.nama_kecamatan,
      presentCadres,
      posyanduName: posyandu.nama_posyandu ?? "-",
      totalCadres: cadreIds.size,
      villageName: posyandu.nama_kelurahan,
    },
  };
}

export async function saveGebyarReport(input: GebyarReportInput) {
  const { petugasId, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const payload = {
    total_pus_binaan: input.total_pus_binaan,
    total_kb_binaan: input.total_kb_binaan,
    total_kb_dilayani: input.total_kb_dilayani,
    pemberian_tambahan_makanan: input.pemberian_tambahan_makanan,
    program_tambahan_total_ppks: input.program_tambahan_total_ppks,
    program_tambahan_total_bkb: input.program_tambahan_total_bkb,
    program_tambahan_total_paud: input.program_tambahan_total_paud,
    program_tambahan_total_gsi: input.program_tambahan_total_gsi,
    program_tambahan_total_psn: input.program_tambahan_total_psn,
    program_tambahan_total_lainnya: input.program_tambahan_total_lainnya,
    mitra_total_perusahaan: input.mitra_total_perusahaan,
    mitra_total_bumn_bumd: input.mitra_total_bumn_bumd,
    mitra_total_kantor_dinas: input.mitra_total_kantor_dinas,
    mitra_total_lsm_lsom: input.mitra_total_lsm_lsom,
    dana_sehat_total_keluarga_sasaran: input.dana_sehat_total_keluarga_sasaran,
    dana_sehat_total_sumbangan: input.dana_sehat_total_sumbangan,
  };
  const existing = await queryOne<{ id: string }>("select id from laporan_gebyar_posyandu where posyandu_id = $1 and periode = $2::timestamptz limit 1", [posyanduId, period]);

  if (existing) {
    const updatePayload = { ...payload, periode: period, updated_at: new Date().toISOString() };
    const data = await updateRow<{ id: string; periode: string }>(tableName, updatePayload, Object.keys(updatePayload), { id: existing.id, posyandu_id: posyanduId });
    return { ...databaseResult(data), mode: "updated" as const };
  }

  const insertPayload = { ...payload, periode: period, posyandu_id: posyanduId, created_by: petugasId };
  const data = await insertRow<{ id: string; periode: string }>(tableName, insertPayload, Object.keys(insertPayload));
  return { ...databaseResult(data), mode: "created" as const };
}

function normalizePeriod(value: string) {
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  if (!match) throw new Error("Periode laporan Gebyar tidak valid.");
  return `${match[1]}-${match[2]}-01`;
}

function conditionalTotal(value: boolean | null | undefined, total: number) {
  if (value === true) return total;
  if (value === false) return 0;
  return null;
}

function sumGender(
  activity: ActivityRow | null,
  maleField: keyof ActivityRow,
  femaleField: keyof ActivityRow,
) {
  if (!activity) return null;
  const male = activity[maleField];
  const female = activity[femaleField];
  if (typeof male !== "number" && typeof female !== "number") return null;
  return (typeof male === "number" ? male : 0) + (typeof female === "number" ? female : 0);
}

async function getNutritionSummary(
  posyanduId: string,
  month: number,
  year: number,
) {
  const currentStart = new Date(Date.UTC(year, month - 1, 1));
  const currentEnd = new Date(Date.UTC(year, month, 1));
  const previousStart = new Date(Date.UTC(year, month - 2, 1));
  const registrationStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const oldestBirthDate = getOldestDisplayedBirthDate(month, year);

  const [children, measurementsResult] = await Promise.all([
    queryRows<NutritionChild>(`select id from balita where posyandu_id = $1 and registered_at >= $2::timestamptz
      and registered_at < $3::timestamptz and (tanggal_lahir is null or tanggal_lahir >= $4::date)`,
      [posyanduId, registrationStart, currentEnd.toISOString(), oldestBirthDate]),
    queryRows<NutritionMeasurement>(`select balita_id, periode_bulan, berat_badan::float8 as berat_badan
      from tumbuh_kembang_balita where posyandu_id = $1 and periode_bulan < $2::date
      and berat_badan is not null order by periode_bulan desc`, [posyanduId, currentEnd.toISOString()]),
  ]);
  const childIds = new Set(children.map((child) => child.id));
  const measurements = measurementsResult
    .filter((measurement) => childIds.has(measurement.balita_id));
  const currentByChild = new Map<string, NutritionMeasurement>();
  const previousByChild = new Map<string, NutritionMeasurement>();
  const weighedLastMonth = new Set<string>();

  for (const measurement of measurements) {
    const measuredAt = new Date(measurement.periode_bulan);
    if (Number.isNaN(measuredAt.getTime())) continue;
    if (measuredAt >= currentStart && !currentByChild.has(measurement.balita_id)) {
      currentByChild.set(measurement.balita_id, measurement);
      continue;
    }
    if (measuredAt < currentStart && !previousByChild.has(measurement.balita_id)) {
      previousByChild.set(measurement.balita_id, measurement);
    }
    if (measuredAt >= previousStart && measuredAt < currentStart) {
      weighedLastMonth.add(measurement.balita_id);
    }
  }

  let firstWeighing = 0;
  let notWeighedLastMonth = 0;
  let weightNotUp = 0;
  let weightUp = 0;
  for (const [childId, current] of currentByChild) {
    const previous = previousByChild.get(childId);
    if (!previous) firstWeighing += 1;
    if (!weighedLastMonth.has(childId)) notWeighedLastMonth += 1;
    if (!previous) continue;
    if (Number(current.berat_badan) > Number(previous.berat_badan)) weightUp += 1;
    else weightNotUp += 1;
  }

  return {
    firstWeighing,
    notWeighedLastMonth,
    totalChildren: children.length,
    weighedChildren: currentByChild.size,
    weightNotUp,
    weightUp,
  };
}

function formatAddress(posyandu: PosyanduRow) {
  const rtRw = posyandu.rt || posyandu.rw
    ? `RT ${posyandu.rt || "-"} / RW ${posyandu.rw || "-"}`
    : null;
  return [posyandu.alamat, rtRw, posyandu.nama_kelurahan ? `Kelurahan ${posyandu.nama_kelurahan}` : null]
    .filter(Boolean)
    .join(", ") || "-";
}
