import JSZip from "jszip";
import * as XLSX from "xlsx-js-style";

import type {
  MonthlyResultsGroupedCount,
  MonthlyResultsOverview,
} from "@/components/reports/monthly-results/types";

const monthNames = [
  "JANUARI",
  "FEBRUARI",
  "MARET",
  "APRIL",
  "MEI",
  "JUNI",
  "JULI",
  "AGUSTUS",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DESEMBER",
];

export async function exportMonthlyResultsReport(
  report: MonthlyResultsOverview,
  chairName: string,
  signatureFile: File,
) {
  const rows = Array.from({ length: 58 }, () =>
    Array.from({ length: 13 }, () => "" as string | number),
  );
  const set = (cell: string, value: string | number | null | undefined) => {
    const { c, r } = XLSX.utils.decode_cell(cell);
    rows[r][c] = value ?? "-";
  };
  const address = report.address;
  const maternal = report.pregnantAndPostpartum;
  const weighing = report.weighingActivities;

  set(
    "A1",
    "FORMAT HASIL KEGIATAN PENIMBANGAN DI POSYANDU (FORM F1 PENIMBANGAN)",
  );
  set("A3", "A. Alamat Posyandu");
  const identity: Array<[string, string | number | null | undefined]> = [
    ["POSYANDU", address.posyanduName],
    ["LOKASI RT/RW", `${address.rt ?? "-"} / ${address.rw ?? "-"}`],
    ["KELURAHAN", address.villageName],
    ["PUSKESMAS KELURAHAN", address.villageName],
    ["KECAMATAN", address.districtName],
    ["KOTA/KABUPATEN ADMINISTRASI", address.cityName],
    ["BULAN KEGIATAN", titleCase(monthNames[report.month - 1])],
    ["TAHUN", report.year],
  ];
  identity.forEach(([label, value], index) =>
    basicRow(set, index + 4, index + 1, label, value),
  );
  set("A13", "B. KADER");
  basicRow(set, 14, 1, "Jumlah Kader", report.cadres.total);
  basicRow(set, 15, 2, "Jumlah Kader yang Aktif", report.cadres.present);
  set("A17", "C. IBU HAMIL DAN IBU NIFAS");
  [
    ["Jumlah Ibu Hamil", maternal.totalPregnantWomen],
    [
      "Jumlah Ibu Hamil yang mendapatkan Tablet Tambah Besi (FE) III (90 tablet)",
      maternal.pregnantWomenReceivedIron,
    ],
    [
      "Jumlah Ibu Hamil Resiko KEK (LILA < 23,5 cm)",
      maternal.pregnantWomenAtRiskOfKek,
    ],
    ["Jumlah Ibu Nifas", maternal.totalPostpartumMothers],
    [
      "Jumlah Ibu Nifas yang mendapat kapsul Vitamin A Merah",
      maternal.postpartumMothersReceivedRedVitaminA,
    ],
  ].forEach(([label, value], index) =>
    basicRow(set, index + 18, index + 1, String(label), value as number | null),
  );

  set("A24", "NO");
  set("B24", "URAIAN KEGIATAN");
  set("D24", "HASIL KEGIATAN/KELOMPOK UMUR");
  [
    ["D25", "0-5 bln"],
    ["F25", "6 - 11 bln"],
    ["H25", "12 - 23 bln"],
    ["J25", "24 - 59 bln"],
    ["L25", "Jumlah"],
  ].forEach(([cell, value]) => set(cell, value));
  for (const column of ["D", "F", "H", "J", "L"]) {
    set(`${column}26`, "L");
    set(`${String.fromCharCode(column.charCodeAt(0) + 1)}26`, "P");
  }
  const groupedRows: Array<
    [number, string, string, MonthlyResultsGroupedCount]
  > = [
    [
      27,
      "D",
      "Jumlah semua Bayi/Balita di Posyandu (S)",
      weighing.registeredChildren,
    ],
    [
      28,
      "E",
      "Jumlah semua Bayi/Balita yang memiliki KMS (K)",
      weighing.childrenWithKms,
    ],
    [
      29,
      "F",
      "Jumlah semua Bayi/Balita yang Ditimbang (D)",
      weighing.weighedChildren,
    ],
    [31, "", "Naik Berat Badannya (N)", weighing.nutritionGuide.weightUp],
    [
      32,
      "",
      "Tidak Naik Berat Badannya (T)",
      weighing.nutritionGuide.weightNotUp,
    ],
    [
      33,
      "",
      "Bulan Lalu Tidak Datang Menimbang (O)",
      weighing.nutritionGuide.notWeighedLastMonth,
    ],
    [
      34,
      "",
      "Baru Pertama Kali Datang Menimbang (B)",
      weighing.nutritionGuide.firstWeighing,
    ],
    [
      35,
      "H",
      "Jumlah Bayi/Balita Bawah Garis Merah (BGM)",
      weighing.belowRedLine,
    ],
    [
      36,
      "I",
      "Jumlah Bayi/Balita BGM yang dirujuk ke Puskesmas",
      weighing.belowRedLineReferred,
    ],
    [
      37,
      "J",
      "Jumlah Bayi/Balita Atas Pita Hijau (APH)",
      weighing.aboveGreenLine,
    ],
    [
      38,
      "K",
      "Jumlah Bayi/Balita APH yang dirujuk ke Puskesmas",
      weighing.aboveGreenLineReferred,
    ],
    [
      39,
      "L",
      "Jumlah Bayi/Balita yang Tidak Naik berat badannya 2X berturut-turut (2 T)",
      weighing.weightNotUpTwice,
    ],
    [
      40,
      "M",
      "Jumlah Bayi/Balita 2T yang dirujuk ke Puskesmas",
      weighing.weightNotUpTwiceReferred,
    ],
  ];
  set("A30", "G");
  set("B30", "Hasil Penimbangan sesuai Rambu Gizi");
  groupedRows.forEach(([row, code, label, value]) =>
    groupedRow(set, row, code, label, value),
  );

  set("A42", "N. Jumlah Bayi dan Balita yang mendapat Kapsul Vitamin A *)");
  set("L42", "L");
  set("M42", "P");
  genderRow(
    set,
    43,
    1,
    "Jumlah Bayi yang mendapatkan Vitamin A Biru (usia 6 - 11 bulan)",
    report.vitaminA.blueCapsuleAge6To11Months,
  );
  genderRow(
    set,
    44,
    2,
    "Jumlah Bayi yang mendapatkan Vitamin A Merah (usia 12 - 59 bulan)",
    report.vitaminA.redCapsuleAge12To59Months,
  );
  set("A46", "O. Bayi Mendapatkan ASI Eksklusif");
  set("L46", "L");
  set("M46", "P");
  const breastfeeding = report.exclusiveBreastfeeding;
  [
    [
      "Jumlah Bayi Usia 0 - 5 bulan 29 hari yang masih diberi ASI saja (ASI Proses)",
      breastfeeding.breastMilkOnlyInProcess,
    ],
    [
      "Jumlah Bayi Usia 0 - 5 bulan 29 hari yang sudah diberikan makanan/minuman selain ASI",
      breastfeeding.receivedOtherFoodOrDrink,
    ],
    [
      "Jumlah Bayi Usia 0 - 5 bulan 29 hari yang datang ke Penimbangan (Tidak Terdata ASI)",
      breastfeeding.weighedWithoutBreastfeedingRegistration,
    ],
    [
      "Jumlah Bayi yang mencapai Usia 6 bulan pada bulan ini",
      breastfeeding.reachedSixMonthsThisMonth,
    ],
    [
      "Jumlah Bayi yang mendapat ASI eksklusif selama 6 bulan pada bulan ini (Lulus ASI Eksklusif)",
      breastfeeding.completedExclusiveBreastfeeding,
    ],
  ].forEach(([label, value], index) =>
    genderRow(
      set,
      47 + index,
      index + 1,
      String(label),
      value as { male: number | null; female: number | null },
    ),
  );

  set("A53", "Ket :");
  set(
    "A54",
    report.savedReport?.keterangan?.trim() ||
      "*) Vitamin A diisi pada bulan pelaksanaan pemberian dan sweeping.",
  );
  const date = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  set("H53", `${address.cityName ?? "Jakarta"}, ${date}`);
  set("H54", "Pelapor Kegiatan Posyandu");
  set("H58", `( ${chairName.toUpperCase()} )`);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = [
    "A1:M1",
    "A3:B3",
    
    "D4:M4",
    "D5:M5",
    "D6:M6",
    "D7:M7",
    "D8:M8",
    "D9:M9",
    "D10:M10",
    "D11:M11",
    "A13:B13",
    "D14:F14",
    "D15:F15",
    "A17:B17",
    "D18:F18",
    "D19:F19",
    "D20:F20",
    "D21:F21",
    "D22:F22",
    "A24:A26",
    "B24:C26",
    "D24:M24",
    "D25:E25",
    "F25:G25",
    "H25:I25",
    "J25:K25",
    "L25:M25",
    ...Array.from(
      { length: 14 },
      (_, index) => `B${27 + index}:C${27 + index}`,
    ),
    "A42:C42",
    "B43:C43",
    "B44:C44",
    "A46:B46",
    "B47:C47",
    "B48:C48",
    "B49:C49",
    "B50:C50",
    "B51:C51",
    "A54:F54",
    "H53:K53",
    "H54:K54",
    "H58:K58",
  ].map(XLSX.utils.decode_range);
  worksheet["!cols"] = [
    3.5,
    58.67,
    0.67,
    ...Array.from({ length: 10 }, () => 4.83),
  ].map((wch) => ({ wch }));
  worksheet["!rows"] = Array.from({ length: 58 }, (_, index) => ({
    hpt: index === 39 ? 42 : [38, 47, 48, 50, 53].includes(index) ? 32 : 19,
  }));
  worksheet["!pageSetup"] = {
    orientation: "portrait",
    fitToHeight: 1,
    fitToWidth: 1,
    paperSize: 5,
  };
  styleWorksheet(worksheet);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Kegiatan");
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    compression: true,
    type: "array",
  }) as ArrayBuffer;
  const output = await embedSignature(buffer, signatureFile);
  download(
    output,
    `FORMAT HASIL KEGIATAN ${monthNames[report.month - 1]} ${report.year}.xlsx`,
  );
}

type Setter = (cell: string, value: string | number | null | undefined) => void;
function basicRow(
  set: Setter,
  row: number,
  number: number,
  label: string,
  value: string | number | null | undefined,
) {
  set(`A${row}`, number);
  set(`B${row}`, label);
  set(`C${row}`, ":");
  set(`D${row}`, value);
}
function genderRow(
  set: Setter,
  row: number,
  number: number,
  label: string,
  value: { male: number | null; female: number | null },
) {
  set(`A${row}`, number);
  set(`B${row}`, label);
  set(`L${row}`, value.male);
  set(`M${row}`, value.female);
}
function groupedRow(
  set: Setter,
  row: number,
  code: string,
  label: string,
  value: MonthlyResultsGroupedCount,
) {
  set(`A${row}`, code);
  set(`B${row}`, label);
  const groups = [
    value.age0To5Months,
    value.age6To11Months,
    value.age12To23Months,
    value.age24To59Months,
    value.total,
  ];
  ["D", "F", "H", "J", "L"].forEach((column, index) => {
    set(`${column}${row}`, groups[index].male);
    set(
      `${String.fromCharCode(column.charCodeAt(0) + 1)}${row}`,
      groups[index].female,
    );
  });
}
function styleWorksheet(sheet: XLSX.WorkSheet) {
  const line = { style: "thin", color: { rgb: "000000" } };
  for (const address of Object.keys(sheet)) {
    if (address.startsWith("!")) continue;
    sheet[address].s = {
      font: { name: "Arial", sz: 9 },
      alignment: { vertical: "center", wrapText: true },
    };
  }
  for (let row = 4; row <= 22; row++) {
    const cell = sheet[`D${row}`];
    if (cell)
      cell.s = {
        ...cell.s,
        alignment: {
          horizontal: row <= 13 ? "left" : "center",
          vertical: "center",
          wrapText: true,
        },
        
      };
  }
  for (const row of [14, 15, 18, 19, 20, 21, 22]) {
    for (let column = 3; column <= 5; column++) {
      const address = XLSX.utils.encode_cell({ r: row - 1, c: column });
      const cell = sheet[address] ?? { t: "s", v: "" };
      sheet[address] = cell;
      cell.s = {
        ...cell.s,
        border: {
          top: line,
          bottom: line,
          left: column === 3 ? line : undefined,
          right: column === 5 ? line : undefined,
        },
      } as never;
    }
  }
  for (let r = 23; r < 40; r++)
    for (let c = 0; c < 13; c++) {
      const address = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[address] ?? { t: "s", v: "" };
      sheet[address] = cell;
      cell.s = {
        ...cell.s,
        fill : r === 29 ? { patternType: "solid", fgColor: { rgb: "D9EAD3" } } : undefined,
        alignment: {
          horizontal: c >= 3 ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
        border: { top: line, bottom: line, left: line, right: line },
      } as never;
    }
  for (let r = 41; r <= 50; r++)
    for (let c = 11; c < 13; c++) {
      const address = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[address] ?? { t: "s", v: "" };
      sheet[address] = cell;
      cell.s = {
        ...cell.s,
        alignment: {
          horizontal: c >= 11 ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
        border: r === 44 ? undefined : { top: line, bottom: line, left: line, right: line },
      } as never;
    }
  for (const address of [
    "A1",
    "A3",
    "A13",
    "A17",
    "A24",
    "B24",
    "D24",
    "A42",
    "A46",
  ])
    if (sheet[address])
      sheet[address].s = {
        ...sheet[address].s,
        font: { bold: true, name: "Arial", sz: address === "A1" ? 11 : 9 },
        alignment: {
          horizontal: address === "A1" ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
      };
}
function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
function imageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpeg";
  throw new Error("Foto tanda tangan harus berformat PNG atau JPG.");
}
async function embedSignature(buffer: ArrayBuffer, file: File) {
  const extension = imageExtension(file);
  const zip = await JSZip.loadAsync(buffer);
  const sheetPath = "xl/worksheets/sheet1.xml";
  const relPath = "xl/worksheets/_rels/sheet1.xml.rels";
  const sheet = await zip.file(sheetPath)?.async("string");
  const content = await zip.file("[Content_Types].xml")?.async("string");
  if (!sheet || !content) throw new Error("Struktur workbook tidak valid.");
  const oldRels = zip.file(relPath)
    ? await zip.file(relPath)!.async("string")
    : null;
  const ids = [...(oldRels ?? "").matchAll(/Id="rId(\d+)"/g)].map((match) =>
    Number(match[1]),
  );
  const id = `rId${Math.max(0, ...ids) + 1}`;
  const relationship = `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`;
  zip.file(
    `xl/media/signature.${extension}`,
    new Uint8Array(await file.arrayBuffer()),
  );
  zip.file(
    "xl/drawings/drawing1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>54</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="1524000" cy="685800"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Tanda Tangan Ketua Posyandu"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`,
  );
  zip.file(
    "xl/drawings/_rels/drawing1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/signature.${extension}"/></Relationships>`,
  );
  zip.file(
    relPath,
    oldRels
      ? oldRels.replace("</Relationships>", `${relationship}</Relationships>`)
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationship}</Relationships>`,
  );
  zip.file(
    sheetPath,
    sheet.replace("</worksheet>", `<drawing r:id="${id}"/></worksheet>`),
  );
  zip.file(
    "[Content_Types].xml",
    content.replace(
      "</Types>",
      '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>',
    ),
  );
  return zip.generateAsync({ compression: "DEFLATE", type: "uint8array" });
}
function download(buffer: Uint8Array, filename: string) {
  const bytes = new Uint8Array(buffer.length);
  bytes.set(buffer);
  const url = URL.createObjectURL(
    new Blob([bytes.buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
