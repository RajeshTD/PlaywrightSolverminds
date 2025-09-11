import ExcelJS from "exceljs";

export default async function readNextColumn(filepath, sheetName, inputValue) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);

  const worksheet = workbook.getWorksheet(sheetName);

  for (let row of worksheet._rows) {
    if (!row) continue;

    for (let cellIndex = 1; cellIndex <= row.cellCount; cellIndex++) {
      const cellValue = row.getCell(cellIndex).value;

      if (cellValue && cellValue.toString().trim() === inputValue) {
        const nextValue = row.getCell(cellIndex + 1).value;

        if (nextValue === null || nextValue === undefined) return "";

        // 🔑 Handle cases: plain string, number, rich text, object
        if (typeof nextValue === "string" || typeof nextValue === "number") {
          return nextValue.toString();
        }

        if (nextValue.text) {
          return nextValue.text; // rich text case
        }

        if (nextValue.richText) {
          return nextValue.richText.map((t) => t.text).join("");
        }

        return nextValue.toString(); // fallback
      }
    }
  }
}
