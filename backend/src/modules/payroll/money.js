export function cents(value = 0) {
  const text = String(value ?? '0');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error(`Invalid money value: ${text}`);
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
}
export function moneyFromCents(value) { return (Math.trunc(value) / 100).toFixed(2); }
export function addCents(...values) { return values.reduce((total, value) => total + (typeof value === 'number' ? value : cents(value)), 0); }
