// Synthetic documents only. No personal résumé, metadata or company material.
import { randomBytes } from 'node:crypto';
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
  const chunks = [Buffer.from('%PDF-1.7\n' + (padding ? '%' + ' '.repeat(padding) + '\n' : ''))];
  let length = chunks[0].length;
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(length);
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), Buffer.isBuffer(object) ? object : Buffer.from(object), Buffer.from('\nendobj\n')]);
    chunks.push(chunk); length += chunk.length;
  }
  let output = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`;
  return Buffer.concat([...chunks, Buffer.from(output)]);
}

export function maximumSyntheticPdf(text = 'Synthetic capacity') {
  const maximum = 5 * 1024 * 1024;
  const memo = Buffer.from(randomBytes(500000).map(value => 97 + value % 26)).toString('ascii');
  const payload = randomBytes(maximum);
  let size = maximum;
  for (;;) {
    const bytes = syntheticPdf({ pages: 10, text, extra: [`<< /SyntheticMemo (${memo}) >>`,
      Buffer.concat([Buffer.from(`<< /Length ${size} >>\nstream\n`), payload.subarray(0, size), Buffer.from('\nendstream')])] });
    if (bytes.length === maximum) return bytes;
    size += maximum - bytes.length;
  }
}
