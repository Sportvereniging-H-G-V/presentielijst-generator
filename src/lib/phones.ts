export function normalizePhone(value?: string | null): string {
  if (!value) {
    return '';
  }
  return value.replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim();
}

export function formatPhones(p1?: string | null, p2?: string | null): string {
  const phones = [normalizePhone(p1), normalizePhone(p2)].filter((phone) => phone.length > 0);
  return phones.join(', ');
}
