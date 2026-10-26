// Synthetic documents only. No personal résumé, metadata or company material.
export function syntheticPdf({ pages = 2, text = 'Synthetic resume', catalog = '', extra = [], annotations = '', padding = 0 } = {}) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R ' + catalog + ' >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const kids = [];
  for (let page = 0; page < pages; page++) {
    const id = objects.length + 1;
    kids.push(`${id} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R ${annotations} >>`);
    const stream = `BT /F1 20 Tf 40 780 Td (${text.replace(/[()\\]/g, '\\$&')} ${page + 1}) Tj ET`;
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Count ${pages} /Kids [${kids.join(' ')}] >>`;
  objects.push(...extra);
  let output = '%PDF-1.7\n' + (padding ? '%' + ' '.repeat(padding) + '\n' : '');
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output);
}
