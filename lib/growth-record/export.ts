import * as XLSX from "xlsx-js-style";

import type { GrowthRecordViewModel } from "@/components/growth-record/types";
import { exportSensitiveValue } from "@/lib/privacy";

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type ExportGrowthRecordsOptions = {
  records: GrowthRecordViewModel[];
  month: number;
  year: number;
  posyanduName?: string;
  includeSensitiveData?: boolean;
};

export function exportGrowthRecordsToExcel({
  includeSensitiveData = true,
  records,
  month,
  year,
  posyanduName,
}: ExportGrowthRecordsOptions) {
  const referenceDate = new Date(year, month, 0);
  const rows: (string | number)[][] = [
    [`POSYANDU BALITA ${(posyanduName || "").toUpperCase()}`.trim()],
    ["DATA PERTUMBUHAN BALITA"],
    [`Bulan : ${monthNames[month - 1]} ${year}`],
    [
      "NO",
      "NAMA BALITA",
      "L/P",
      "TGL LAHIR",
      "NIK ANAK",
      "NAMA ORANG TUA",
      "",
      "ALAMAT",
      "USIA BLN",
      "NIK ORANG TUA",
      "BB",
      "LILA",
      "LK",
      "TB",
    ],
    ["", "", "", "", "", "AYAH", "IBU"],
    ...records.map((record, index) => [
      index + 1,
      record.nama,
      record.jenis_kelamin,
      formatDate(record.tanggal_lahir),
      exportSensitiveValue(record.nik_anak, includeSensitiveData),
      record.nama_ayah ?? "",
      record.nama_ibu ?? "",
      record.alamat ?? "",
      getAgeInMonths(record.tanggal_lahir, referenceDate) ?? "",
      exportSensitiveValue(record.nik_ortu, includeSensitiveData),
      record.berat_badan ?? "",
      record.lingkar_lengan ?? "",
      record.lingkar_kepala ?? "",
      record.tinggi_badan ?? "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = [
    XLSX.utils.decode_range("A4:A5"),
    XLSX.utils.decode_range("B4:B5"),
    XLSX.utils.decode_range("C4:C5"),
    XLSX.utils.decode_range("D4:D5"),
    XLSX.utils.decode_range("E4:E5"),
    XLSX.utils.decode_range("F4:G4"),
    XLSX.utils.decode_range("H4:H5"),
    XLSX.utils.decode_range("I4:I5"),
    XLSX.utils.decode_range("J4:J5"),
    XLSX.utils.decode_range("K4:K5"),
    XLSX.utils.decode_range("L4:L5"),
    XLSX.utils.decode_range("M4:M5"),
    XLSX.utils.decode_range("N4:N5"),
  ];
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 6 },
    { wch: 12 },
    { wch: 19 },
    { wch: 24 },
    { wch: 24 },
    { wch: 25 },
    { wch: 10 },
    { wch: 19 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
  ];
  worksheet["!rows"] = [{ hpt: 24 }, { hpt: 22 }, { hpt: 24 }, { hpt: 32 }, { hpt: 28 }];
  worksheet["!freeze"] = { xSplit: 0, ySplit: 5 };
  worksheet["!autofilter"] = { ref: `A4:N${Math.max(5, rows.length)}` };

  applyStyles(worksheet, rows.length);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pertumbuhan");
  XLSX.writeFile(
    workbook,
    `DATA POSYANDU BALITA ${safeFileName(posyanduName || "")}-${monthNames[month - 1]}-${year}.xlsx`,
    { compression: true },
  );
}

function applyStyles(worksheet: XLSX.WorkSheet, rowCount: number) {
  const border = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };
  const headerStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "D9EAD3" } },
    font: { bold: true, name: "Calibri", sz: 11 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  };

  for (let row = 3; row < rowCount; row++) {
    for (let column = 0; column < 14; column++) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
      worksheet[address].s = row <= 4
        ? headerStyle
        : {
            alignment: {
              horizontal: [1, 5, 6, 7].includes(column) ? "left" : "center",
              vertical: "center",
              wrapText: true,
            },
            border,
          };
    }
  }

  for (const address of ["A1", "A2", "A3"]) {
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true, name: "Calibri", sz: address === "A1" ? 16 : 12 },
      alignment: { vertical: "center" },
    };
  }
}

function getAgeInMonths(value: string, referenceDate: Date) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  return Math.max(
    0,
    (referenceDate.getFullYear() - birthDate.getFullYear()) * 12 +
      referenceDate.getMonth() -
      birthDate.getMonth() -
      (referenceDate.getDate() < birthDate.getDate() ? 1 : 0),
  );
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function safeFileName(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "POSYANDU";
}
