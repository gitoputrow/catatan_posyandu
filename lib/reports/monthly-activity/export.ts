import * as XLSX from "xlsx-js-style";

import type { MonthlyActivityGenderCount, MonthlyActivityOverview } from "@/components/reports/monthly-activity/types";
import type { User } from "@/components/user/types";

const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];

export function exportMonthlyActivityReport(report: MonthlyActivityOverview, user: User) {
  const dataRow = buildDataRow(report, user.nama_posyandu ?? "");
  const rows: (string | number)[][] = [
    ["DATA KEGIATAN POSYANDU", ...emptyColumns(56)],
    [`KELURAHAN ${(user.nama_kelurahan ?? "").toUpperCase()} KECAMATAN PANCORAN`, ...emptyColumns(56)],
    ["KOTA ADMINISTRASI JAKARTA SELATAN", ...emptyColumns(56)],
    [`TAHUN  ${report.year}`, ...emptyColumns(56)],
    [`BULAN : ${monthNames[report.month - 1]}`, ...emptyColumns(56)],
    ["NO", "NAMA POSYANDU", "JML IBU HAMIL", "DIPERIKSA", "FE TAB (TABLET BESI)", "JML IBU MENYUSUI", "JML. ASEPTOR KB", "", "", "", "", "", "", "", "PENIMBANGAN BALITA", "", "", "", "", "", "", "", "", "", "", "", "IMUNISASI TT IBU HAMIL", "", "JUMLAH BAYI YANG DIIMUNISASI", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "BALITA YANG MENDERITA DIARE", "", "", "", "KET"],
    ["", "", "", "", "", "", "KONDOM", "PIL", "IMPLANT", "MOP", "MOW", "IUD", "SUNTIK", "LAIN-LAIN", "JML BALITA", "", "JML BALITA YANG MEMILIKI KMS(K)", "", "JML YANG DITIMBANG", "", "JML YANG NAIK", "", "JML YANG MENDAPAT VITAMIN A", "", "JML YG MENDAPAT PMT", "", "", "", "BCG", "", "DPT", "", "", "", "", "", "POLIO", "", "", "", "", "", "", "", "CAMPAK", "", "HEPATITIS B", "", "", "", "", "", "", "", "", "", ""],
    emptyColumns(57),
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "I", "II", "", "", "I", "", "II", "", "III", "", "I", "", "II", "", "III", "", "IV", "", "", "", "I", "", "II", "", "III", "", "JUMLAH", "", "YANG MENDAPAT ORALIT", "", ""],
    emptyColumns(57),
    emptyColumns(57),
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "", "", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", "L", "P", ""],
    dataRow,
    ...Array.from({ length: 19 }, () => emptyColumns(57)),
    ["", "JUMLAH", ...dataRow.slice(2)],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = createMerges();
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    ...Array.from({ length: 55 }, () => ({ wch: 7 })),
  ];
  worksheet["!rows"] = [
    { hpt: 24 },
    { hpt: 22 },
    { hpt: 22 },
    { hpt: 22 },
    { hpt: 22 },
    ...Array.from({ length: 7 }, () => ({ hpt: 34 })),
    ...Array.from({ length: 21 }, () => ({ hpt: 22 })),
  ];
  worksheet["!freeze"] = { xSplit: 2, ySplit: 12 };
  worksheet["!margins"] = { left: 0.2, right: 0.2, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
  worksheet["!pageSetup"] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };
  applyStyles(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Kegiatan Posyandu");
  XLSX.writeFile(workbook, `FORM KEGIATAN POSYANDU ${monthNames[report.month - 1]} ${report.year}.xlsx`, { compression: true });
}

function buildDataRow(report: MonthlyActivityOverview, posyanduName: string) {
  const saved = report.savedReport;
  const activeChildren = report.weighingSummary.activeChildren;
  const kms = report.weighingSummary.kmsK;
  const weighed = report.weighingSummary.weighedChildren;
  const weightUp = report.weighingSummary.weightUp;
  const vitaminA = report.weighingSummary.vitaminA;
  const pmt = report.weighingSummary.pmt;

  return [
    1,
    posyanduName,
    report.totalPregnantWomen,
    booleanTotal(saved?.periksa_bumil ?? null, report.totalPregnantWomen),
    booleanTotal(saved?.fe_tab_tablet_besi ?? null, report.totalPregnantWomen),
    report.totalBreastfeedingMothers,
    value(saved?.total_kb_kondom),
    value(saved?.total_kb_pil),
    value(saved?.total_kb_implant),
    value(saved?.total_kb_mop),
    value(saved?.total_kb_mow),
    value(saved?.total_kb_iud),
    value(saved?.total_kb_suntik),
    value(saved?.total_kb_lainnya),
    activeChildren.male,
    activeChildren.female,
    genderValue(kms, "male"),
    genderValue(kms, "female"),
    weighed.male,
    weighed.female,
    weightUp.male,
    weightUp.female,
    genderValue(vitaminA, "male"),
    genderValue(vitaminA, "female"),
    genderValue(pmt, "male"),
    genderValue(pmt, "female"),
    booleanTotal(saved?.imunisasi_tt_1 ?? null, report.totalPregnantWomen),
    booleanTotal(saved?.imunisasi_tt_2 ?? null, report.totalPregnantWomen),
    value(saved?.total_bcg_l),
    value(saved?.total_bcg_p),
    value(saved?.total_dpt_1_l),
    value(saved?.total_dpt_1_p),
    value(saved?.total_dpt_2_l),
    value(saved?.total_dpt_2_p),
    value(saved?.total_dpt_3_l),
    value(saved?.total_dpt_3_p),
    value(saved?.total_polio_1_l),
    value(saved?.total_polio_1_p),
    value(saved?.total_polio_2_l),
    value(saved?.total_polio_2_p),
    value(saved?.total_polio_3_l),
    value(saved?.total_polio_3_p),
    value(saved?.total_polio_4_l),
    value(saved?.total_polio_4_p),
    value(saved?.total_campak_l),
    value(saved?.total_campak_p),
    value(saved?.total_hepatitis_b_1_l),
    value(saved?.total_hepatitis_b_1_p),
    value(saved?.total_hepatitis_b_2_l),
    value(saved?.total_hepatitis_b_2_p),
    value(saved?.total_hepatitis_b_3_l),
    value(saved?.total_hepatitis_b_3_p),
    value(saved?.total_balita_diare_l),
    value(saved?.total_balita_diare_p),
    value(saved?.total_oralit_l),
    value(saved?.total_oralit_p),
    saved?.keterangan?.trim() || "",
  ];
}

function value(value?: number | null) {
  return value ?? "-";
}

function genderValue(count: MonthlyActivityGenderCount | null, field: "male" | "female") {
  return count ? count[field] : "-";
}

function booleanTotal(value: boolean | null, total: number) {
  if (value === true) return total;
  if (value === false) return 0;
  return "-";
}

function emptyColumns(length: number) {
  return Array.from({ length }, () => "");
}

function createMerges() {
  return [
    "A1:BE1", "A2:BE2", "A3:BE3", "A4:BE4", "A5:BE5",
    "A6:A12", "B6:B12", "C6:C12", "D6:D12", "E6:E12", "F6:F12",
    "G6:N6", "G7:G12", "H7:H12", "I7:I12", "J7:J12", "K7:K12", "L7:L12", "M7:M12", "N7:N12",
    "O6:Z6", "O7:P11", "Q7:R11", "S7:T11", "U7:V11", "W7:X11", "Y7:Z11",
    "AA6:AB8", "AC6:AZ6", "AC7:AD11", "AE7:AJ8", "AK7:AR8", "AS7:AT11", "AU7:AZ8",
    "AE9:AF11", "AG9:AH11", "AI9:AJ11", "AK9:AL11", "AM9:AN11", "AO9:AP11", "AQ9:AR11", "AU9:AV11", "AW9:AX11", "AY9:AZ11",
    "BA6:BD8", "BA9:BB11", "BC9:BD11", "BE6:BE12",
  ].map((range) => XLSX.utils.decode_range(range));
}

function applyStyles(worksheet: XLSX.WorkSheet) {
  const border = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };

  const isRotatedText = (address: string) => {
    const rotatedTextAddresses = [
      "C6", "D6", "E6", "F6", "G7", "H7", "I7", "J7", "K7", "L7", "M7", "N7",
    ];
    return rotatedTextAddresses.includes(address);
  }

  const headerFill = { patternType: "solid", fgColor: { rgb: "D9EAD3" } };

  for (let row = 5; row <= 32; row++) {
    for (let column = 0; column < 57; column++) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
      worksheet[address].s = {
        fill: row <= 11 ? headerFill : undefined,
        font: { bold: row <= 11 || row === 32, name: "Calibri", sz: row <= 11 ? 8 : 10 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true, textRotation: isRotatedText(address) ? 180 : 0 },
        border,
      };
    }
  }

  for (const address of ["A1", "A2", "A3", "A4", "A5"]) {
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true, name: "Calibri", sz: address === "A1" ? 16 : 12 },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  for (const address of ["B13", "B33", "BE13"]) {
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      ...worksheet[address].s,
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
    };
  }
}
