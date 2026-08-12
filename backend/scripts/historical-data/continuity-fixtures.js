export function parseDelimited(text) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) { const char = text[i]; const next = text[i + 1]; if (char === '"' && quoted && next === '"') { value += '"'; i += 1; } else if (char === '"') quoted = !quoted; else if ((char === ',' || char === '\n' || char === '\r') && !quoted) { if (char === ',') row.push(value); else if (char === '\n') { row.push(value); rows.push(row); row = []; value = ''; } } else value += char; }
  if (value.length || row.length) { row.push(value); rows.push(row); }
  return rows.filter(values => values.some(item => String(item).trim() !== ''));
}

export function parseCsv(text) { const rows = parseDelimited(text); const headers = rows.shift().map(value => value.trim()); return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? '').trim()]))); }
