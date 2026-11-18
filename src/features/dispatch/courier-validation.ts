export function normalizeReceivedBy(value: string): string | null {
  const name = value.trim();
  return name.length >= 2 && name.length <= 100 ? name : null;
}
