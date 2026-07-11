import * as XLSX from "xlsx-js-style";

import type { Child } from "@/components/children/types";
import { exportSensitiveValue } from "@/lib/privacy";

const headers = [
  "No",
  "kelurahan",
  "anak_keberapa (1 atau2 dll)",
  "tgl_lahir",
  "USIA",
  "jenis kelamin",
  "nomor_KK",
  "NIK",
  "nama_anak",
  "nama_ortu",
  "nik_ortu",
  "hp_ortu",
  "alamat",
  "rt",
  "rw",
  "Posyandu mana",
];

type ExportChildrenOptions = {
  includeSensitiveData?: boolean;
};

export function exportChildrenToExcel(children: Child[], options: ExportChildrenOptions = {}) {
  const includeSensitiveData = options.includeSensitiveData ?? true;
  const year = new Date().getFullYear();
  const rows = [
    [`PENDATAAN BALITA TAHUN ${year}`],
    ["KECAMATAN PANCORAN"],
    [],
    headers,
    ...children.map((child, index) => [
      index + 1,
      child.nama_kelurahan ?? "",
      child.no_urut_anak ?? "",
      formatDate(child.tanggal_lahir),
      getAgeInMonths(child.tanggal_lahir),
      child.jenis_kelamin ?? "",
      exportSensitiveValue(child.nomor_kk, includeSensitiveData),
      exportSensitiveValue(child.nik_anak, includeSensitiveData),
      child.nama_anak ?? "",
      child.nama_ayah ?? "",
      exportSensitiveValue(child.nik_ortu, includeSensitiveData),
      exportSensitiveValue(child.hp_ortu || child.no_hp_ibu || child.no_hp_ayah, includeSensitiveData),
      child.alamat ?? "",
      child.rt ?? "",
      child.rw ?? "",
      child.nama_posyandu ?? "",
    ]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!merges"] = [
    XLSX.utils.decode_range("A1:P1"),
    XLSX.utils.decode_range("A2:P2"),
  ];
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 13 },
    { wch: 12 },
    { wch: 13 },
    { wch: 7 },
    { wch: 14 },
    { wch: 18 },
    { wch: 19 },
    { wch: 29 },
    { wch: 28 },
    { wch: 19 },
    { wch: 16 },
    { wch: 27 },
    { wch: 7 },
    { wch: 7 },
    { wch: 22 },
  ];
  worksheet["!rows"] = [{ hpt: 28.5 }, { hpt: 28.5 }, {}, { hpt: 60 }];

  const headerStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "FFFF00" } },
    font: { bold: true, color: { rgb: "000000" }, sz: 14, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
  };

  for (let column = 0; column < 16; column++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 3, c: column });
    worksheet[cellAddress].s = headerStyle;
  }

  worksheet["A1"].s = {
    font: { bold: true, color: { rgb: "000000" }, sz: 22, name: "Calibri" },
  };

  worksheet["A2"].s = {
    font: { bold: true, color: { rgb: "000000" }, sz: 16, name: "Calibri" },
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pendataan Balita");
  XLSX.writeFile(workbook, `PENDATAAN BALITA TAHUN ${year}.xlsx`, {
    compression: true,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getAgeInMonths(value?: string | null) {
  if (!value) return "";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  const months =
    (today.getFullYear() - birthDate.getFullYear()) * 12 +
    today.getMonth() -
    birthDate.getMonth() -
    (today.getDate() < birthDate.getDate() ? 1 : 0);

  return Math.max(0, months);
}
