import * as XLSX from "xlsx-js-style";

import type {
  GrowthHistoryChild,
  GrowthHistoryMeasurement,
} from "@/components/growth-history/types";

export const historyMonthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const circumferenceMonths = new Set([2, 6, 12]);

export function exportSelectedGrowthHistory(
  child: GrowthHistoryChild,
  measurements: GrowthHistoryMeasurement[],
  month: number,
  year: number,
) {
  const measurementByMonth = createMeasurementMap(measurements);
  const rows: (string | number)[][] = [
    [`RIWAYAT PERTUMBUHAN ${child.nama.toUpperCase()}`],
    [`Periode Januari - ${historyMonthNames[month - 1]} ${year}`],
    ["BULAN", "BB", "TB", "LILA", "LK"],
    ...Array.from({ length: month }, (_, index) => {
      const currentMonth = index + 1;
      const measurement = measurementByMonth.get(`${child.id}-${currentMonth}`);
      return [
        historyMonthNames[index],
        measurement?.berat_badan ?? "",
        measurement?.tinggi_badan ?? "",
        circumferenceMonths.has(currentMonth) ? measurement?.lingkar_lengan ?? "" : "",
        circumferenceMonths.has(currentMonth) ? measurement?.lingkar_kepala ?? "" : "",
      ];
    }),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = [XLSX.utils.decode_range("A1:E1"), XLSX.utils.decode_range("A2:E2")];
  worksheet["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  applyTableStyles(worksheet, rows.length, 5, 2);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Pertumbuhan");
  XLSX.writeFile(workbook, `RIWAYAT ${safeFileName(child.nama)}-${year}.xlsx`, { compression: true });
}

export function exportAllGrowthHistories(
  children: GrowthHistoryChild[],
  measurements: GrowthHistoryMeasurement[],
  month: number,
  year: number,
) {
  const measurementByMonth = createMeasurementMap(measurements);
  const firstChild = children[0];
  const rows: (string | number)[][] = [
    [],
    [`REGISTER/KOHORT POSYANDU ${(firstChild?.nama_kelurahan || "").toUpperCase()}`],
    [`NAMA POSYANDU : ${(firstChild?.nama_posyandu || "").toUpperCase()}`],
    createRegisterHeader(),
    createRegisterSubHeader(),
    ...children.map((child, index) => {
      const row: (string | number)[] = [
        index + 1,
        child.nama,
        child.nik_anak ?? "",
        formatDate(child.tanggal_lahir),
        child.jenis_kelamin,
        [child.nama_ayah, child.nama_ibu].filter(Boolean).join(" / "),
        child.nik_ortu ?? "",
        formatAddress(child),
        getAgeInMonths(child.tanggal_lahir, new Date(year, month, 0)) ?? "",
      ];

      for (let currentMonth = 1; currentMonth <= 12; currentMonth++) {
        const measurement = measurementByMonth.get(`${child.id}-${currentMonth}`);
        row.push(measurement?.berat_badan ?? "", measurement?.tinggi_badan ?? "");
        if (circumferenceMonths.has(currentMonth)) {
          row.push(measurement?.lingkar_lengan ?? "", measurement?.lingkar_kepala ?? "");
        }
      }
      return row;
    }),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = [
    XLSX.utils.decode_range("A2:AM2"),
    ...Array.from({ length: 9 }, (_, column) => XLSX.utils.decode_range(`${columnName(column)}4:${columnName(column)}5`)),
    ...monthMergeRanges(),
  ];
  worksheet["!cols"] = [
    { wch: 5 }, { wch: 28 }, { wch: 19 }, { wch: 12 }, { wch: 6 }, { wch: 30 }, { wch: 19 }, { wch: 18 }, { wch: 9 },
    ...Array.from({ length: 30 }, () => ({ wch: 7 })),
  ];
  worksheet["!freeze"] = { xSplit: 0, ySplit: 5 };
  applyTableStyles(worksheet, rows.length, 39, 3);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Register Posyandu");
  XLSX.writeFile(
    workbook,
    `REGISTER POSYANDU ${historyMonthNames[month - 1].toUpperCase()} ${year}.xlsx`,
    { compression: true },
  );
}

function createRegisterHeader() {
  const row = ["NO", "NAMA BALITA", "NIK ANAK", "TGL LAHIR", "L/P", "NAMA ORANG TUA", "NIK ORANG TUA", "RT / RW", "USIA"];
  for (let month = 1; month <= 12; month++) {
    row.push(month === 8 ? "AGT" : month === 11 ? "NOP" : historyMonthNames[month - 1].slice(0, 3).toUpperCase(), "");
    if (circumferenceMonths.has(month)) row.push("LILA / LK", "");
  }
  return row;
}

function createRegisterSubHeader() {
  const row = Array(9).fill("");
  for (let month = 1; month <= 12; month++) {
    row.push("BB", "TB");
    if (circumferenceMonths.has(month)) row.push("LILA", "LK");
  }
  return row;
}

function monthMergeRanges() {
  const ranges: XLSX.Range[] = [];
  let column = 9;
  for (let month = 1; month <= 12; month++) {
    ranges.push({ s: { r: 3, c: column }, e: { r: 3, c: column + 1 } });
    column += 2;
    if (circumferenceMonths.has(month)) {
      ranges.push({ s: { r: 3, c: column }, e: { r: 3, c: column + 1 } });
      column += 2;
    }
  }
  return ranges;
}

function createMeasurementMap(measurements: GrowthHistoryMeasurement[]) {
  const map = new Map<string, GrowthHistoryMeasurement>();
  for (const measurement of measurements) {
    const date = new Date(measurement.periode_bulan);
    if (!Number.isNaN(date.getTime())) map.set(`${measurement.balita_id}-${date.getUTCMonth() + 1}`, measurement);
  }
  return map;
}

function applyTableStyles(worksheet: XLSX.WorkSheet, rowCount: number, columnCount: number, headerRow: number) {
  const border = {
    top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } },
  };
  for (let row = headerRow; row < rowCount; row++) {
    for (let column = 0; column < columnCount; column++) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
      worksheet[address].s = {
        fill: row <= headerRow + 1 ? { patternType: "solid", fgColor: { rgb: "D9EAD3" } } : undefined,
        font: { bold: row <= headerRow + 1, name: "Calibri", sz: 10 },
        alignment: { horizontal: column === 1 || column === 5 || column === 7 ? "left" : "center", vertical: "center", wrapText: true },
        border,
      };
    }
  }
  for (const address of ["A1", "A2", "A3"]) {
    if (worksheet[address]) worksheet[address].s = { font: { bold: true, name: "Calibri", sz: address === "A2" ? 16 : 12 } };
  }
}

function getAgeInMonths(value: string | null, referenceDate: Date) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  return Math.max(0, (referenceDate.getFullYear() - birthDate.getFullYear()) * 12 + referenceDate.getMonth() - birthDate.getMonth() - (referenceDate.getDate() < birthDate.getDate() ? 1 : 0));
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatAddress(child: GrowthHistoryChild) {
  const rtRw = child.rt || child.rw ? `RT ${child.rt || "-"}/${child.rw || "-"}` : "";
  return [rtRw, child.alamat].filter(Boolean).join(" - ");
}

function columnName(column: number) {
  return XLSX.utils.encode_col(column);
}

function safeFileName(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "BALITA";
}
