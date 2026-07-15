import * as XLSX from "xlsx-js-style";

import type { GebyarReport } from "@/components/reports/gebyar/types";
import type { User } from "@/components/user/types";

const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];

export function exportGebyarReport(report: GebyarReport, user: User) {
  const rows = Array.from({ length: 61 }, () => Array.from({ length: 15 }, () => "" as string | number));
  const set = (cell: string, value: string | number | null | undefined) => {
    const { c, r } = XLSX.utils.decode_cell(cell);
    rows[r][c] = value ?? "-";
  };

  set("A1", "F/I/Gebyar Posy./09");
  set("A2", "LAPORAN HASIL KEGIATAN\nGEBYAR POSYANDU 27 DKI JAKARTA\nTINGKAT KELURAHAN");
  set("A7", "I."); set("B7", "IDENTITAS POSYANDU"); set("J7", `Bulan : ${monthNames[report.month - 1]} ${report.year}`);
  set("B9", "1."); set("C9", "Nama Posyandu"); set("D9", ":"); set("E9", report.identity.posyanduName);
  set("B10", "2."); set("C10", "Alamat"); set("D10", ":"); set("E10", report.identity.address); set("H10", `Kelurahan : ${report.identity.villageName ?? "-"}`);
  set("B11", "3."); set("C11", "Kecamatan"); set("D11", ":"); set("E11", report.identity.districtName);
  set("B12", "4."); set("C12", "Kota / Kabupaten"); set("D12", ":"); set("E12", report.identity.cityOrRegency);
  set("B13", "5."); set("C13", "Jumlah Kader"); set("D13", ":"); set("E13", `Yang Ada : ${report.identity.totalCadres}`); set("H13", `Yang Hadir : ${report.identity.presentCadres}`);

  set("A15", "II."); set("B15", "HASIL KEGIATAN");
  section(set, "B17", "A.", "C17", "KESEHATAN IBU DAN ANAK");
  item(set, 18, 1, "Jumlah Bumil (Ibu Hamil)", report.healthOfMotherAndChild.totalPregnantWomen);
  item(set, 19, 2, "Jumlah Bumil yang Diperiksa", report.healthOfMotherAndChild.pregnantWomenExamined);
  item(set, 20, 3, "Pemberian Vitamin A bagi Balita", availability(report.healthOfMotherAndChild.vitaminAProvided));

  section(set, "G17", "B.", "H17", "KB (KELUARGA BERENCANA)");
  rightItem(set, 18, 1, "Jumlah PUS Binaan", report.familyPlanning.coachedCouplesOfReproductiveAge);
  rightItem(set, 19, 2, "Jumlah Peserta KB Binaan", report.familyPlanning.coachedParticipants);
  rightItem(set, 20, 3, "Peserta KB yang Dilayani", report.familyPlanning.servedParticipants?.total);
  subItem(set, 21, "a. IUD", report.familyPlanning.servedParticipants?.iud);
  subItem(set, 22, "b. Implant", report.familyPlanning.servedParticipants?.implant);
  subItem(set, 23, "c. Suntik", report.familyPlanning.servedParticipants?.injection);
  subItem(set, 24, "d. Pil", report.familyPlanning.servedParticipants?.pill);
  subItem(set, 25, "e. Kondom", report.familyPlanning.servedParticipants?.condom);
  subItem(set, 26, "f. Steril", report.familyPlanning.servedParticipants?.sterilization);

  section(set, "B24", "C.", "C24", "GIZI");
  const nutritionRows: Array<[string, string, string | number | null]> = [
    ["Jumlah Seluruh Balita", "(S)", report.nutrition.totalChildren], ["Balita Memiliki KMS", "(K)", report.nutrition.hasKms],
    ["Balita Ditimbang", "(D)", report.nutrition.weighedChildren], ["Balita Naik Berat Badan", "(N)", report.nutrition.weightUp],
    ["Balita Tidak Naik Berat Badan", "(T)", report.nutrition.weightNotUp], ["Balita Pertama Kali Ditimbang", "(B)", report.nutrition.firstWeighing],
    ["Ditimbang Bulan Ini, Tidak Bulan Lalu", "(O)", report.nutrition.notWeighedLastMonth], ["Berat Badan di Bawah Garis Merah (BGM)", "", report.nutrition.belowRedLine],
  ];
  nutritionRows.forEach(([label, code, value], index) => { const row = 25 + index; item(set, row, index + 1, `${label}${code ? ` ${code}` : ""}`, value); });

  section(set, "G28", "D.", "H28", "IMUNISASI");
  const immunizations: Array<[string, number | null]> = [
    ["BCG", report.immunization.bcg], ["Polio 1", report.immunization.polio1], ["Polio 2", report.immunization.polio2], ["Polio 3", report.immunization.polio3], ["Polio 4", report.immunization.polio4],
    ["Campak", report.immunization.campak], ["TT Ibu Hamil 1", report.immunization.pregnantWomenTt1], ["TT Ibu Hamil 2", report.immunization.pregnantWomenTt2],
    ["DPT 1", report.immunization.dpt1], ["DPT 2", report.immunization.dpt2], ["DPT 3", report.immunization.dpt3],
    ["Hepatitis B 1", report.immunization.hepatitis1], ["Hepatitis B 2", report.immunization.hepatitis2], ["Hepatitis B 3", report.immunization.hepatitis3],
  ];
  immunizations.forEach(([label, value], index) => rightItem(set, 29 + index, index + 1, label, value));

  section(set, "B34", "E.", "C34", "PENCEGAHAN DIARE");
  item(set, 35, 1, "Jumlah Balita Diduga Diare", report.diarrheaPrevention.childrenSuspectedDiarrhea);
  item(set, 36, 2, "Jumlah Balita Diberi Oralit", report.diarrheaPrevention.childrenGivenOralit);
  section(set, "B38", "F.", "C38", "PEMBERIAN MAKANAN TAMBAHAN");
  set("B39", "1."); set("C39", "Ada"); set("D39", ":"); set("E39", report.supplementaryFeeding === true ? "✓" : report.supplementaryFeeding === null ? "-" : "");
  set("B40", "2."); set("C40", "Tidak Ada"); set("D40", ":"); set("E40", report.supplementaryFeeding === false ? "✓" : report.supplementaryFeeding === null ? "-" : "");

  set("A42", "III."); set("B42", "PROGRAM TAMBAHAN");
  const programs: Array<[string, number | null]> = [["Jumlah PPKS", report.additionalPrograms.ppks], ["Jumlah BKB", report.additionalPrograms.bkb], ["Jumlah PAUD", report.additionalPrograms.paud], ["Pembinaan Lansia", report.additionalPrograms.elderlyDevelopment], ["Gerakan Sayang Ibu (GSI)", report.additionalPrograms.gsi], ["Pemberantasan Sarang Nyamuk (PSN)", report.additionalPrograms.psn], ["Jumlah Lain-lain", report.additionalPrograms.other]];
  programs.forEach(([label, value], index) => item(set, 43 + index, index + 1, label, value));

  set("G44", "IV."); set("H44", "MITRA POSYANDU YANG TERLIBAT");
  [["Jumlah Perusahaan", report.involvedPartners.company], ["Jumlah BUMN / BUMD", report.involvedPartners.bumnOrBumd], ["Jumlah Kantor / Dinas", report.involvedPartners.governmentOffice], ["Jumlah LSM / LSOM", report.involvedPartners.lsmOrLsom]].forEach(([label, value], index) => rightItem(set, 45 + index, index + 1, String(label), value as number | null));
  set("G51", "V."); set("H51", "DANA SEHAT");
  rightItem(set, 52, 1, "Jumlah Keluarga Sasaran", report.healthyFund.targetFamilies);
  rightItem(set, 53, 2, "Jumlah Keluarga Menyumbang", report.healthyFund.contributingFamilies);
  set("H54", "Total"); set("I54", ":"); set("J54", report.healthyFund.total);

  const exportDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  set("H56", `${report.identity.cityOrRegency ?? "Jakarta"}, ${exportDate}`); set("H57", "Ketua Posyandu,"); set("H61", (user.nama ?? "").toUpperCase());

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = ["A1:C1", "A2:O4", "B7:C7", "J7:L7", "E9:J9", "E10:G10", "H10:J10", "E11:J11", "E12:J12", "E13:G13", "H13:J13", "B15:C15", "H56:I56", "H57:I57", "H61:I61"].map((range) => XLSX.utils.decode_range(range));
  worksheet["!cols"] = [4.5, 5.2, 29.3, 2.2, 14.8, 10.2, 5.2, 29, 2, 14, 7.3, 5.3, 6, 3.5, 5.2].map((wch) => ({ wch }));
  worksheet["!rows"] = Array.from({ length: 61 }, (_, index) => ({ hpt: index === 3 ? 22 : [30, 31, 48].includes(index) ? 32 : 18 }));
  worksheet["!margins"] = { left: 0, right: 0, top: 0.39, bottom: 0.39, header: 0.31, footer: 0.31 };
  worksheet["!pageSetup"] = { orientation: "portrait", fitToWidth: 1, fitToHeight: 1 };
  styleWorksheet(worksheet);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Gebyar Posyandu");
  XLSX.writeFile(workbook, `FORM GEBYAR POSYANDU ${monthNames[report.month - 1]} ${report.year}.xlsx`, { compression: true });
}

type Setter = (cell: string, value: string | number | null | undefined) => void;
function section(set: Setter, numberCell: string, number: string, titleCell: string, title: string) { set(numberCell, number); set(titleCell, title); }
function item(set: Setter, row: number, number: number, label: string, value: string | number | null | undefined) { set(`B${row}`, `${number}.`); set(`C${row}`, label); set(`D${row}`, ":"); set(`E${row}`, value); }
function rightItem(set: Setter, row: number, number: number, label: string, value: string | number | null | undefined) { set(`G${row}`, `${number}.`); set(`H${row}`, label); set(`I${row}`, ":"); set(`J${row}`, value); }
function subItem(set: Setter, row: number, label: string, value: number | null | undefined) { set(`H${row}`, label); set(`I${row}`, ":"); set(`J${row}`, value); }
function availability(value: boolean | null | undefined) { return value === true ? "Ada" : value === false ? "Tidak Ada" : "Belum diisi"; }

function styleWorksheet(worksheet: XLSX.WorkSheet) {
  const underline = { bottom: { style: "thin", color: { rgb: "000000" } } };
  for (const address of Object.keys(worksheet)) {
    if (address.startsWith("!")) continue;
    const cell = worksheet[address];
    cell.s = { font: { name: "Calibri", sz: 10 }, alignment: { vertical: "center", wrapText: true } };
  }
  if (worksheet.A2) worksheet.A2.s = { font: { bold: true, name: "Calibri", sz: 11 }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
  for (const address of ["A7", "B7", "A15", "B15", "B17", "C17", "G17", "H17", "B24", "C24", "G28", "H28", "B34", "C34", "B38", "C38", "A42", "B42", "G44", "H44", "G51", "H51"]) if (worksheet[address]) worksheet[address].s = { ...worksheet[address].s, font: { bold: true, name: "Calibri", sz: 10 } };
  for (let row = 1; row <= 61; row++) for (const column of [4, 9]) { const address = XLSX.utils.encode_cell({ r: row - 1, c: column }); if (worksheet[address]?.v !== "") worksheet[address].s = { ...worksheet[address].s, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: underline } as never; }
  if (worksheet.H61) worksheet.H61.s = { ...worksheet.H61.s, font: { bold: true, name: "Calibri", sz: 10 }, border: underline };
}
