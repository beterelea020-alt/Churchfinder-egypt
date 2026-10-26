import type { AppLocation, Church, ChurchEvent, ChurchSchedule, HelpRequest, Restaurant } from '../types';

/** Supabase's public anon/publishable key is expected here. Never put service_role keys in Vite env. */
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
export const isBackendConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const SESSION_KEY = 'churchfinder.auth.session.v1';

/** New sb_publishable_* keys are API keys, not JWTs; never send them as Bearer tokens. */
function anonymousAuthorizationHeader(): Record<string, string> {
  return SUPABASE_ANON_KEY.startsWith('sb_publishable_')
    ? {}
    : { Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
}
function authorizationHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : anonymousAuthorizationHeader();
}

type User = { id: string; email?: string; user_metadata?: { full_name?: string; name?: string }; app_metadata?: Record<string, unknown> };
export type AuthSession = { access_token: string; refresh_token: string; expires_at?: number; token_type?: string; user: User };
export type UserProfile = { id: string; full_name: string | null; role: 'user' | 'admin'; preferred_language?: string | null; created_at?: string; phone?: string | null; email?: string | null; avatar_url?: string | null; bio?: string | null; city?: string | null };
const PROFILE_COLS = 'id,full_name,role,preferred_language,created_at,phone,email,avatar_url,bio,city';

type DbChurch = {
  id: string; name: string; address: string; neighborhood: string | null; governorate: string;
  denomination: string | null; latitude: number; longitude: number; image_url: string | null;
  description: string | null; phone: string | null; services: string[] | null; facilities: string[] | null;
  service_notes: string | null; opening_hours: Record<string, string> | null; is_open: boolean | null; verified: boolean; is_published: boolean; rating?: number | null;
};
type DbRestaurant = {
  id: string; name: string; category: string; address: string; governorate: string;
  latitude: number; longitude: number; image_url: string | null; price_range: string | null;
  verified: boolean; is_published: boolean; rating?: number | null;
};

export class BackendError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, status?: number, details?: unknown) { super(message); this.name = 'BackendError'; this.status = status; this.details = details; }
}

function readSession(): AuthSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as AuthSession | null; } catch { return null; }
}
export function getStoredSession(): AuthSession | null { return readSession(); }
function saveSession(session: AuthSession | null) {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let body: unknown = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  if (!response.ok) {
    const source = body as { message?: string; msg?: string; error_description?: string; error?: string; details?: unknown } | null;
    throw new BackendError(source?.message || source?.msg || source?.error_description || source?.error || `تعذر إكمال الطلب (${response.status}).`, response.status, body);
  }
  return body as T;
}

async function authRequest<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  if (!isBackendConfigured) throw new BackendError('الباك إند غير مضبوط. أضف VITE_SUPABASE_URL وVITE_SUPABASE_ANON_KEY إلى ملف .env.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...authorizationHeader(options.token),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  return parseResponse<T>(response);
}

async function refreshSession(session: AuthSession): Promise<AuthSession> {
  const result = await authRequest<Omit<AuthSession, 'user'> & { user?: User; expires_in?: number }>('token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
  const refreshed = { ...result, user: result.user || session.user, expires_at: result.expires_at || (result.expires_in ? Math.floor(Date.now() / 1000) + result.expires_in : undefined) } as AuthSession;
  saveSession(refreshed);
  return refreshed;
}

export async function restoreAuthSession(): Promise<AuthSession | null> {
  if (!isBackendConfigured) return null;
  const saved = readSession();
  if (!saved) return null;
  try {
    let active = saved;
    if (active.expires_at && active.expires_at < Math.floor(Date.now() / 1000) + 30) active = await refreshSession(active);
    const user = await authRequest<User>('user', { token: active.access_token });
    const updated = { ...active, user };
    saveSession(updated);
    return updated;
  } catch {
    try { return await refreshSession(saved); }
    catch { saveSession(null); return null; }
  }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const result = await authRequest<AuthSession & { expires_in?: number }>('token?grant_type=password', { method: 'POST', body: { email: email.trim().toLowerCase(), password } });
  const session = { ...result, expires_at: result.expires_at || (result.expires_in ? Math.floor(Date.now() / 1000) + result.expires_in : undefined) } as AuthSession;
  saveSession(session);
  return session;
}

export async function signUpWithPassword(email: string, password: string, fullName: string, phone = ''): Promise<{ session: AuthSession | null; user: User | null; confirmationRequired: boolean }> {
  const result = await authRequest<(Partial<AuthSession> & { user?: User; expires_in?: number })>('signup', { method: 'POST', body: { email: email.trim().toLowerCase(), password, data: { full_name: fullName.trim(), phone: phone.trim() } } });
  let session: AuthSession | null = null;
  if (result.access_token && result.refresh_token && result.user) {
    session = { ...result, expires_at: result.expires_at || (result.expires_in ? Math.floor(Date.now() / 1000) + result.expires_in : undefined) } as AuthSession;
    saveSession(session);
  }
  return { session, user: result.user || null, confirmationRequired: !session };
}

export async function signOutRemote(session: AuthSession | null) {
  try { if (session?.access_token && isBackendConfigured) await authRequest<unknown>('logout', { method: 'POST', token: session.access_token }); }
  catch { /* Expired/offline remote sessions should still be cleared locally. */ }
  finally { saveSession(null); }
}

async function restRequest<T>(table: string, query = '', options: { method?: string; body?: unknown; session?: AuthSession | null; prefer?: string; headers?: Record<string, string> } = {}): Promise<T> {
  if (!isBackendConfigured) throw new BackendError('خدمة البيانات غير مضبوطة.');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...authorizationHeader(options.session?.access_token),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  return parseResponse<T>(response);
}

export async function loadPublicChurches(): Promise<Church[] | null> {
  if (!isBackendConfigured) return null;
  const columns = 'id,name,address,neighborhood,governorate,denomination,latitude,longitude,image_url,description,phone,services,facilities,service_notes,opening_hours,is_open,verified,is_published,rating';
  const [rows, scheduleRows] = await Promise.all([
    restRequest<DbChurch[]>('churches', `select=${columns}&is_published=eq.true&order=name.asc`),
    restRequest<{ id: string; church_id: string; title: string; day_of_week: number | null; starts_at: string | null; ends_at: string | null; notes: string | null; is_verified: boolean }[]>('church_services', 'select=id,church_id,title,day_of_week,starts_at,ends_at,notes,is_verified&is_published=eq.true&order=day_of_week.asc,starts_at.asc'),
  ]);
  const scheduleByChurch = new Map<string, ChurchSchedule[]>();
  for (const item of scheduleRows) {
    const schedule = scheduleByChurch.get(item.church_id) || [];
    schedule.push({ id: item.id, title: item.title, dayOfWeek: item.day_of_week, startsAt: item.starts_at, endsAt: item.ends_at, notes: item.notes, verified: item.is_verified });
    scheduleByChurch.set(item.church_id, schedule);
  }
  return rows.map((row) => ({
    id: row.id, name: row.name, address: row.address, neighborhood: row.neighborhood || row.governorate,
    governorate: row.governorate, denomination: row.denomination || 'غير محدد',
    coordinates: { lat: Number(row.latitude), lng: Number(row.longitude) },
    image: row.image_url || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=900&q=80',
    description: row.description || 'لا يوجد وصف بعد.',
    services: row.services || [], facilities: row.facilities || [], phone: row.phone || undefined, rating: row.rating ? Number(row.rating) : undefined,
    scheduleNote: row.service_notes || 'لا توجد مواعيد مضافة بعد.', scheduleEntries: scheduleByChurch.get(row.id) || [], openingHours: row.opening_hours || undefined,
    sampleOpen: row.is_open ?? undefined, verified: row.verified,
  }));
}

export async function loadNearbyChurchIds(session: AuthSession | null, latitude: number, longitude: number, radiusMeters = 15000): Promise<Array<{ id: string; distance_meters: number }>> {
  return restRequest<Array<{ id: string; distance_meters: number }>>('rpc/nearby_churches', '', {
    method: 'POST', session, body: { p_lat: latitude, p_lng: longitude, p_radius_meters: radiusMeters },
  });
}

export async function loadPublicRestaurants(): Promise<Restaurant[] | null> {
  if (!isBackendConfigured) return null;
  const columns = 'id,name,category,address,governorate,latitude,longitude,image_url,price_range,verified,is_published,rating';
  const rows = await restRequest<DbRestaurant[]>('restaurants', `select=${columns}&is_published=eq.true&order=name.asc`);
  return rows.map((row) => ({
    id: row.id, name: row.name, category: row.category, address: row.address, governorate: row.governorate,
    coordinates: { lat: Number(row.latitude), lng: Number(row.longitude) },
    image: row.image_url || 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80',
    priceLabel: row.price_range || '', rating: row.rating ? Number(row.rating) : undefined, verified: row.verified,
  }));
}

export async function fetchProfile(session: AuthSession): Promise<UserProfile | null> {
  const rows = await restRequest<UserProfile[]>('profiles', `select=${PROFILE_COLS}&id=eq.${encodeURIComponent(session.user.id)}&limit=1`, { session });
  return rows[0] || null;
}

export async function updateProfile(session: AuthSession, fields: Partial<Pick<UserProfile, 'full_name' | 'phone' | 'bio' | 'city' | 'avatar_url'>>): Promise<UserProfile> {
  const rows = await restRequest<UserProfile[]>('profiles', `id=eq.${encodeURIComponent(session.user.id)}&select=${PROFILE_COLS}`, {
    method: 'PATCH', body: fields, session, prefer: 'return=representation',
  });
  if (!rows[0]) throw new BackendError('لم يتم حفظ بيانات الملف الشخصي.');
  return rows[0];
}

export async function loadFavorites(session: AuthSession): Promise<string[]> {
  const rows = await restRequest<{ church_id: string | null; restaurant_id: string | null }[]>('favorites', 'select=church_id,restaurant_id&order=created_at.desc', { session });
  return rows.map((item) => item.church_id || item.restaurant_id || '').filter(Boolean);
}

export async function addFavorite(session: AuthSession, id: string, type: 'church' | 'restaurant') {
  const body = type === 'church' ? { user_id: session.user.id, church_id: id } : { user_id: session.user.id, restaurant_id: id };
  await restRequest('favorites', '', { method: 'POST', body, session, prefer: 'return=minimal' });
}
export async function removeFavorite(session: AuthSession, id: string, type: 'church' | 'restaurant') {
  const field = type === 'church' ? 'church_id' : 'restaurant_id';
  await restRequest('favorites', `select=id&${field}=eq.${encodeURIComponent(id)}`, { method: 'DELETE', session, prefer: 'return=minimal' });
}

export type PlaceInput = {
  name: string; address: string; governorate: string; latitude: number; longitude: number;
  neighborhood?: string; denomination?: string; category?: string; image_url?: string; description?: string;
  phone?: string; services?: string[]; facilities?: string[]; service_notes?: string;
  is_open?: boolean | null; price_range?: string; verified?: boolean; is_published?: boolean;
  source_name?: string; source_url?: string; opening_hours?: Record<string, string>; verified_at?: string | null; rating?: number | null;
};
export async function adminCreatePlace(session: AuthSession, type: 'churches' | 'restaurants', input: PlaceInput) {
  const body = { ...input, ...(input.verified === true ? { verified_at: new Date().toISOString() } : {}) };
  return restRequest(type, '', { method: 'POST', body, session, prefer: 'return=representation' });
}
export async function adminUpdatePlace(session: AuthSession, type: 'churches' | 'restaurants', id: string, input: Partial<PlaceInput>) {
  const body = { ...input, ...(input.verified === true ? { verified_at: new Date().toISOString() } : input.verified === false ? { verified_at: null } : {}) };
  return restRequest(type, `id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body, session, prefer: 'return=representation' });
}
export async function adminDeletePlace(session: AuthSession, type: 'churches' | 'restaurants', id: string) {
  return restRequest(type, `id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', session, prefer: 'return=minimal' });
}

export function localLocationToString(location: AppLocation | null) { return location?.label || (location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'غير محدد'); }


export type AdminChurchRecord = {
  id: string; name: string; address: string; neighborhood: string | null; governorate: string;
  denomination: string | null; latitude: number; longitude: number; image_url: string | null;
  description: string | null; phone: string | null; services: string[]; facilities: string[];
  service_notes: string | null; opening_hours: Record<string, string> | null; is_open: boolean | null; verified: boolean; is_published: boolean;
  source_name: string | null; source_url: string | null; created_at: string; updated_at: string; rating: number | null;
};
export type AdminRestaurantRecord = {
  id: string; name: string; category: string; address: string; governorate: string; latitude: number;
  longitude: number; image_url: string | null; phone: string | null; price_range: string | null;
  verified: boolean; is_published: boolean; source_name: string | null; source_url: string | null;
  created_at: string; updated_at: string; rating: number | null;
};
export type AdminServiceRecord = {
  id: string; church_id: string; title: string; day_of_week: number | null; starts_at: string | null;
  ends_at: string | null; notes: string | null; is_verified: boolean; is_published: boolean;
  source_name: string | null; source_url: string | null; verified_at: string | null;
};
export async function adminLoadPlaces(session: AuthSession, type: 'churches'): Promise<AdminChurchRecord[]> {
  return restRequest<AdminChurchRecord[]>('churches', 'select=*&order=updated_at.desc', { session });
}
export async function adminLoadPlacesRestaurants(session: AuthSession): Promise<AdminRestaurantRecord[]> {
  return restRequest<AdminRestaurantRecord[]>('restaurants', 'select=*&order=updated_at.desc', { session });
}
export async function adminLoadServices(session: AuthSession): Promise<AdminServiceRecord[]> {
  return restRequest<AdminServiceRecord[]>('church_services', 'select=*&order=created_at.desc', { session });
}
export async function adminCreateService(session: AuthSession, input: Omit<AdminServiceRecord, 'id' | 'verified_at'>) {
  const body = { ...input, ...(input.is_verified ? { verified_at: new Date().toISOString() } : {}) };
  return restRequest<AdminServiceRecord[]>('church_services', '', { method: 'POST', body, session, prefer: 'return=representation' });
}
export async function adminUpdateService(session: AuthSession, id: string, input: Partial<Omit<AdminServiceRecord, 'id'>>) {
  const body = { ...input, ...(input.is_verified === true ? { verified_at: new Date().toISOString() } : input.is_verified === false ? { verified_at: null } : {}) };
  return restRequest<AdminServiceRecord[]>('church_services', `id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body, session, prefer: 'return=representation' });
}
export async function adminDeleteService(session: AuthSession, id: string) {
  return restRequest('church_services', `id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', session, prefer: 'return=minimal' });
}


/* ---------- Images (Supabase Storage bucket "images") ---------- */
export async function uploadImage(session: AuthSession, path: string, file: File): Promise<string> {
  if (!isBackendConfigured) throw new BackendError('الباك إند غير مضبوط.');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/images/${path}`, {
    method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, ...authorizationHeader(session.access_token), 'x-upsert': 'true', 'Content-Type': file.type || 'image/jpeg' }, body: file,
  });
  await parseResponse<unknown>(response);
  return `${SUPABASE_URL}/storage/v1/object/public/images/${path}?v=${Date.now()}`;
}

/* ---------- Events (اجتماعات) & help requests (مساعدات) ---------- */
type DbEvent = { id: string; church_id: string | null; title: string; kind: string; description: string | null; starts_on: string | null; starts_at: string | null; location_note: string | null; is_published?: boolean };
const mapEvent = (r: DbEvent): ChurchEvent => ({ id: r.id, churchId: r.church_id, title: r.title, kind: r.kind, description: r.description, startsOn: r.starts_on, startsAt: r.starts_at, locationNote: r.location_note });
export async function loadPublicEvents(): Promise<ChurchEvent[]> {
  if (!isBackendConfigured) return [];
  const rows = await restRequest<DbEvent[]>('church_events', 'select=*&is_published=eq.true&order=starts_on.asc.nullslast,starts_at.asc');
  return rows.map(mapEvent);
}
type DbHelp = { id: string; church_id: string | null; user_id: string | null; title: string; details: string | null; category: string; contact_phone: string | null; status: 'open' | 'in_progress' | 'done'; is_published: boolean; created_at: string };
const mapHelp = (r: DbHelp): HelpRequest => ({ id: r.id, churchId: r.church_id, userId: r.user_id, title: r.title, details: r.details, category: r.category, contactPhone: r.contact_phone, status: r.status, isPublished: r.is_published, createdAt: r.created_at });
export async function loadHelpRequests(session: AuthSession | null): Promise<HelpRequest[]> {
  if (!isBackendConfigured) return [];
  const rows = await restRequest<DbHelp[]>('help_requests', 'select=*&order=created_at.desc', { session });
  return rows.map(mapHelp);
}
export async function submitHelpRequest(session: AuthSession, input: { title: string; details: string; category: string; contact_phone: string; church_id?: string | null }) {
  await restRequest('help_requests', '', { method: 'POST', session, prefer: 'return=minimal', body: { ...input, church_id: input.church_id || null, user_id: session.user.id, is_published: false } });
}
export async function deleteOwnHelp(session: AuthSession, id: string) {
  await restRequest('help_requests', `id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', session, prefer: 'return=minimal' });
}

/* ---------- Generic admin CRUD (events, help requests, users) ---------- */
export async function adminList<T>(session: AuthSession, table: string, order = 'created_at.desc'): Promise<T[]> {
  return restRequest<T[]>(table, `select=*&order=${order}`, { session });
}
export async function adminInsert(session: AuthSession, table: string, body: Record<string, unknown>) {
  return restRequest(table, '', { method: 'POST', body, session, prefer: 'return=minimal' });
}
export async function adminPatch(session: AuthSession, table: string, id: string, body: Record<string, unknown>) {
  return restRequest(table, `id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body, session, prefer: 'return=minimal' });
}
export async function adminRemove(session: AuthSession, table: string, id: string) {
  return restRequest(table, `id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', session, prefer: 'return=minimal' });
}
