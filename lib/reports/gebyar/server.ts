import "server-only";

import type { GebyarReport, SavedGebyarReport } from "@/components/reports/gebyar/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
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
  total_pus: number | null;
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
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextPeriod = new Date(Date.UTC(year, month, 1));
  const monthEnd = `${nextPeriod.getUTCFullYear()}-${String(nextPeriod.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const [posyanduResult, cadreResult, attendanceResult, activityResult, nutrition, gebyarResult] = await Promise.all([
    supabase
      .from("posyandu")
      .select("nama_posyandu, alamat, rt, rw, nama_kelurahan, nama_kecamatan, nama_kota")
      .eq("id", posyanduId)
      .single(),
    supabase
      .from("petugas")
      .select("id")
      .eq("posyandu_id", posyanduId)
      .eq("jenis_petugas", "kader"),
    supabase
      .from("laporan_kehadiran_posyandu")
      .select("id_petugas, total_ibu_hamil, total_pus")
      .eq("posyandu_id", posyanduId)
      .gte("periode", monthStart)
      .lt("periode", monthEnd)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("laporan_kegiatan_posyandu")
      .select("periksa_bumil, dapat_vit_a, balita_kmsk, imunisasi_tt_1, imunisasi_tt_2, total_kb_iud, total_kb_implant, total_kb_suntik, total_kb_pil, total_kb_kondom, total_kb_mop, total_kb_mow, total_bcg_l, total_bcg_p, total_polio_1_l, total_polio_1_p, total_polio_2_l, total_polio_2_p, total_polio_3_l, total_polio_3_p, total_polio_4_l, total_polio_4_p, total_campak_l, total_campak_p, total_dpt_1_l, total_dpt_1_p, total_dpt_2_l, total_dpt_2_p, total_dpt_3_l, total_dpt_3_p, total_hepatitis_b_1_l, total_hepatitis_b_1_p, total_hepatitis_b_2_l, total_hepatitis_b_2_p, total_hepatitis_b_3_l, total_hepatitis_b_3_p, total_balita_diare_l, total_balita_diare_p, total_oralit_l, total_oralit_p")
      .eq("posyandu_id", posyanduId)
      .gte("periode", monthStart)
      .lt("periode", monthEnd)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getNutritionSummary(supabase, posyanduId, month, year),
    supabase
      .from(tableName)
      .select("id, periode, pemberian_tambahan_makanan, program_tambahan_total_ppks, program_tambahan_total_bkb, program_tambahan_total_paud, program_tambahan_total_gsi, program_tambahan_total_psn, program_tambahan_total_lainnya, mitra_total_perusahaan, mitra_total_bumn_bumd, mitra_total_kantor_dinas, mitra_total_lsm_lsom, dana_sehat_total_keluarga_sasaran, dana_sehat_total_sumbangan")
      .eq("posyandu_id", posyanduId)
      .gte("periode", monthStart)
      .lt("periode", monthEnd)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (posyanduResult.error) throw posyanduResult.error;
  if (cadreResult.error) throw cadreResult.error;
  if (attendanceResult.error) throw attendanceResult.error;
  if (activityResult.error) throw activityResult.error;
  if (gebyarResult.error) throw gebyarResult.error;

  const posyandu = posyanduResult.data as PosyanduRow;
  const attendance = attendanceResult.data as AttendanceRow | null;
  const activity = activityResult.data as ActivityRow | null;
  const gebyar = gebyarResult.data as GebyarReportRow | null;
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
  const cadreIds = new Set((cadreResult.data ?? []).map((cadre) => cadre.id));
  const presentCadres = new Set(
    (attendance?.id_petugas ?? []).filter((officerId) => cadreIds.has(officerId)),
  ).size;

  return {
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
      coachedCouplesOfReproductiveAge: attendance?.total_pus ?? 0,
      coachedParticipants: null,
      servedParticipants: servedParticipants ? {
        ...servedParticipants,
        total: Object.values(servedParticipants).reduce((total, value) => total + value, 0),
      } : null,
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
  const { petugasId, supabase, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const payload = {
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
  const { data: existing, error: existingError } = await supabase
    .from(tableName)
    .select("id")
    .eq("posyandu_id", posyanduId)
    .eq("periode", period)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const result = await supabase
      .from(tableName)
      .update({ ...payload, periode: period, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("posyandu_id", posyanduId)
      .select("id, periode")
      .single();
    return { ...result, mode: "updated" as const };
  }

  const result = await supabase
    .from(tableName)
    .insert({ ...payload, periode: period, posyandu_id: posyanduId, created_by: petugasId })
    .select("id, periode")
    .single();
  return { ...result, mode: "created" as const };
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
  supabase: Awaited<ReturnType<typeof getAuthenticatedPetugas>>["supabase"],
  posyanduId: string,
  month: number,
  year: number,
) {
  const currentStart = new Date(Date.UTC(year, month - 1, 1));
  const currentEnd = new Date(Date.UTC(year, month, 1));
  const previousStart = new Date(Date.UTC(year, month - 2, 1));
  const registrationStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const oldestBirthDate = getOldestDisplayedBirthDate(month, year);

  const [childrenResult, measurementsResult] = await Promise.all([
    supabase
      .from("balita")
      .select("id")
      .eq("posyandu_id", posyanduId)
      .gte("registered_at", registrationStart)
      .lt("registered_at", currentEnd.toISOString())
      .or(`tanggal_lahir.is.null,tanggal_lahir.gte.${oldestBirthDate}`),
    supabase
      .from("tumbuh_kembang_balita")
      .select("balita_id, periode_bulan, berat_badan")
      .eq("posyandu_id", posyanduId)
      .lt("periode_bulan", currentEnd.toISOString())
      .not("berat_badan", "is", null)
      .order("periode_bulan", { ascending: false }),
  ]);
  if (childrenResult.error) throw childrenResult.error;
  if (measurementsResult.error) throw measurementsResult.error;

  const children = (childrenResult.data ?? []) as NutritionChild[];
  const childIds = new Set(children.map((child) => child.id));
  const measurements = ((measurementsResult.data ?? []) as NutritionMeasurement[])
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
