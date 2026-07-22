import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Parser as Json2csvParser } from 'json2csv';

/**
 * Streams a PDF report to the given writable response.
 * @param {import('express').Response} res
 * @param {{title: string, columns: {label:string,key:string}[], rows: object[]}} report
 */
export const streamPdf = (res, { title, columns, rows }) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).fillColor('#1f2d3d').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#666666').text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1);

  const startX = doc.page.margins.left;
  let y = doc.y;
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / columns.length;

  const drawRow = (values, isHeader = false) => {
    doc.fontSize(9).fillColor(isHeader ? '#ffffff' : '#222222');
    if (isHeader) {
      doc.rect(startX, y, colWidth * columns.length, 20).fill('#1f2d3d');
      doc.fillColor('#ffffff');
    }
    values.forEach((val, i) => {
      doc.text(String(val ?? ''), startX + i * colWidth + 4, y + 5, { width: colWidth - 8, ellipsis: true });
    });
    y += 22;
    if (y > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  };

  drawRow(columns.map((c) => c.label), true);
  rows.forEach((row) => drawRow(columns.map((c) => row[c.key])));

  doc.end();
};

/**
 * Streams an Excel workbook to the given writable response.
 */
export const streamExcel = async (res, { title, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Marriage Advisory Platform';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.substring(0, 31));
  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: 22 }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2D3D' } };

  rows.forEach((row) => sheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
};

/**
 * Sends a CSV file to the given response.
 */
export const sendCsv = (res, { title, columns, rows }) => {
  const parser = new Json2csvParser({ fields: columns.map((c) => ({ label: c.label, value: c.key })) });
  const csv = parser.parse(rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.csv"`);
  res.status(200).send(csv);
};

export const generateReport = async (res, format, reportData) => {
  switch (format) {
    case 'pdf':
      return streamPdf(res, reportData);
    case 'excel':
    case 'xlsx':
      return streamExcel(res, reportData);
    case 'csv':
      return sendCsv(res, reportData);
    default:
      throw new Error(`Unsupported report format: ${format}`);
  }
};

export default { streamPdf, streamExcel, sendCsv, generateReport };
