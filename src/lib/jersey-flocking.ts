export type Flocking = { name: string; number: string };

export function validFlockingName(name: string) {
  const trimmed = name.trim();
  return trimmed.length <= 24 && /\p{L}/u.test(trimmed) && /^[\p{L}\p{M} .'’\-]+$/u.test(trimmed);
}

export function validFlockingNumber(number: string) {
  return /^[0-9]{1,2}$/.test(number);
}
