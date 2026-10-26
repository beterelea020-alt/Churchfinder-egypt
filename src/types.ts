export type Coordinates = { lat: number; lng: number };
export type ChurchSchedule = { id: string; title: string; dayOfWeek: number | null; startsAt: string | null; endsAt: string | null; notes?: string | null; verified: boolean };
export type Church = {
  id: string; name: string; address: string; neighborhood: string; governorate: string;
  denomination: string; coordinates: Coordinates; image: string; description: string;
  sampleOpen?: boolean; verified?: boolean; services: string[]; facilities: string[]; phone?: string;
  rating?: number; scheduleNote: string; scheduleEntries?: ChurchSchedule[]; openingHours?: Record<string, string>; sampleDistance?: string;
};
export type Restaurant = {
  id: string; name: string; category: string; address: string; governorate: string;
  coordinates: Coordinates; image: string; priceLabel: string; sampleRating?: number; rating?: number; verified?: boolean;
};
export type RouteInfo = { distanceKm: number; durationMin: number; coordinates: [number, number][] };
export type AppLocation = Coordinates & { label?: string };

export type ChurchEvent = { id: string; churchId: string | null; title: string; kind: string; description: string | null; startsOn: string | null; startsAt: string | null; locationNote: string | null };
export type HelpRequest = { id: string; churchId: string | null; userId: string | null; title: string; details: string | null; category: string; contactPhone: string | null; status: 'open' | 'in_progress' | 'done'; isPublished: boolean; createdAt: string };
