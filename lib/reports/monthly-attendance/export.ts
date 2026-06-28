import * as XLSX from "xlsx-js-style";

import type { MonthlyAttendanceReport } from "@/components/reports/monthly-attendance/types";
import type { User } from "@/components/user/types";

const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];

export function exportMonthlyAttendanceReport(report: MonthlyAttendanceReport, user: User) {
  const dataRow = buildDataRow(report, user.nama_posyandu ?? "");
  const rows: (string | number)[][] = [
    ["DATA PENGUNJUNG"],
    [`KELURAHAN ${(user.nama_kelurahan ?? "").toUpperCase()} KECAMATAN PANCORAN`],
    ["KOTA ADMINISTRASI JAKARTA SELATAN"],
    [`TAHUN ${report.year}`],
    [`BULAN : ${monthNames[report.month - 1]}`],
    ["NO", "NAMA POSYANDU", "JUMLAH PENGUNJUNG", "", "", "", "", "", "", "", "", "", "", "", "JUMLAH PETUGAS YANG HADIR", "", "", "", "", "", "JUMLAH BAYI", "", "", "", "KET"],
    ["", "", "BALITA", "", "", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "BAYI", "", "", "", "BALITA", "", "", "WUS", "IBU", "", "", "KADER", "", "PLKB", "", "MEDIS", ""],
    ["", "", "", "0-12 BULAN", "", "", "", "1-5 TAHUN", "", "", "PUS", "HAMIL", "MENYUSUI", "", "", "", "", "", "DAN PARA", "", "TOTAL", "", "TOTAL", ""],
    ["", "", "BARU", "", "LAMA", "", "BARU", "", "LAMA", "", "", "", "", "", "", "", "", "", "MEDIS", "", "LAHIR", "", "MENINGGAL", ""],
    ["", "", "L", "P", "L", "P", "L", "P", "L", "P", "", "", "", "", "L", "P", "L", "P", "L", "P", "", "", "", "", ""],
    dataRow,
    ...Array.from({ length: 10 }, () => Array(25).fill("")),
    ["JUMLAH", "", ...dataRow.slice(2)],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = createMerges();
  worksheet["!cols"] = [{ wch: 5 }, { wch: 25 }, ...Array.from({ length: 8 }, () => ({ wch: 7 })), { wch: 7 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, ...Array.from({ length: 10 }, () => ({ wch: 7 })), { wch: 12 }];
  worksheet["!rows"] = [{ hpt: 22 }, { hpt: 22 }, { hpt: 22 }, { hpt: 24 }, { hpt: 28 }, ...Array.from({ length: 8 }, () => ({ hpt: 24 }))];
  worksheet["!freeze"] = { xSplit: 2, ySplit: 11 };
  worksheet["!margins"] = { left: 0.2, right: 0.2, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
  worksheet["!pageSetup"] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };
  applyStyles(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pengunjung");
  XLSX.writeFile(workbook, `DATA PENGUNJUNG POSYANDU ${monthNames[report.month - 1]} ${report.year}.xlsx`, { compression: true });
}

function buildDataRow(report: MonthlyAttendanceReport, posyanduName: string) {
  const infantMale = findRow(report, "0-12-months", "L");
  const infantFemale = findRow(report, "0-12-months", "P");
  const childMale = findRow(report, "1-5-years", "L");
  const childFemale = findRow(report, "1-5-years", "P");
  const info = report.information;
  return [1, posyanduName,
    infantMale?.newChildren ?? 0, infantFemale?.newChildren ?? 0, infantMale?.existingChildren ?? 0, infantFemale?.existingChildren ?? 0,
    childMale?.newChildren ?? 0, childFemale?.newChildren ?? 0, childMale?.existingChildren ?? 0, childFemale?.existingChildren ?? 0,
    info.totalWus, info.totalPus, info.totalPregnantWomen, info.totalBreastfeedingMothers,
    info.totalMaleCadres, info.totalFemaleCadres, info.totalMalePlkb, info.totalFemalePlkb,
    info.totalMaleMedicalStaff, info.totalFemaleMedicalStaff,
    info.totalChildrenBorn, "", info.totalChildrenDied, "", ""];
}

function findRow(report: MonthlyAttendanceReport, ageGroup: "0-12-months" | "1-5-years", gender: "L" | "P") {
  return report.rows.find((row) => row.ageGroup === ageGroup && row.gender === gender);
}

function createMerges() {
  return ["A1:Y1", "A2:Y2", "A3:Y3", "A4:Y4", "A5:Y5", "C6:N6", "O6:T7", "U6:X8", "A6:A11", "B6:B11", "Y6:Y11", "C7:J7", "K7:N7", "D8:E8", "H8:I8", "L8:N8", "O8:P10", "Q8:R10", "S8:T8", "D9:E9", "H9:I9", "S9:T9", "U9:V9", "W9:X9", "C10:D10", "E10:F10", "G10:H10", "I10:J10", "U10:V11", "W10:X11", "K8:K11", "L9:L11", "M9:M11", "N9:N11", "A23:B23"].map((range) => XLSX.utils.decode_range(range));
}

function applyStyles(worksheet: XLSX.WorkSheet) {
  const border = { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } };
  for (let row = 5; row <= 22; row++) {
    for (let column = 0; column < 25; column++) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
      worksheet[address].s = { fill: row <= 10 ? { patternType: "solid", fgColor: { rgb: "D9EAD3" } } : undefined, font: { bold: row <= 10 || row === 22, name: "Calibri", sz: row <= 10 ? 9 : 10 }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border };
    }
  }
  for (const address of ["A1", "A2", "A3", "A4", "A5"]) {
    if (worksheet[address]) worksheet[address].s = { font: { bold: true, name: "Calibri", sz: address === "A1" ? 16 : 12 }, alignment: { horizontal: "center", vertical: "center" } };
  }
}
