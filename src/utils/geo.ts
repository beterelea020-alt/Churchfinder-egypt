import type { Coordinates } from '../types';
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function formatDistance(value: number): string { return value < 1 ? `${Math.round(value * 1000)} م` : `${value.toFixed(1)} كم`; }
