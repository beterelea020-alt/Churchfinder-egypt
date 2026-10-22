import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppLocation, Church, ChurchEvent, HelpRequest, Restaurant } from '../types';
import { churches as demoChurches, restaurants as demoRestaurants } from '../data/sampleData';
import {
  addFavorite, fetchProfile, isBackendConfigured, loadFavorites, loadPublicChurches, loadPublicRestaurants, loadPublicEvents, loadHelpRequests, submitHelpRequest, uploadImage,
  removeFavorite, restoreAuthSession, signInWithPassword, signOutRemote, signUpWithPassword, updateProfile,
  type AuthSession, type UserProfile,
} from '../lib/backend';

export type DataStatus = 'demo' | 'live' | 'offline';
type RegisterResult = { confirmationRequired: boolean };
type AppState = {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  location: AppLocation | null;
  setLocation: (location: AppLocation | null) => void;
  userName: string;
  setUserName: (name: string) => void;
  saveProfileName: (name: string) => Promise<void>;
  saveProfile: (fields: { full_name?: string; phone?: string; bio?: string; city?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  events: ChurchEvent[];
  helpRequests: HelpRequest[];
  refreshHelp: () => Promise<void>;
  sendHelp: (input: { title: string; details: string; category: string; contact_phone: string; church_id?: string | null }) => Promise<void>;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  churches: Church[];
  restaurants: Restaurant[];
  dataStatus: DataStatus;
  dataMessage: string;
  refreshPlaces: () => Promise<void>;
  authSession: AuthSession | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  backendConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, phone: string) => Promise<RegisterResult>;
  signOut: () => Promise<void>;
  feedbackMessage: string;
  clearFeedback: () => void;
};
const Context = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cf-favorites') || '[]') as string[]; } catch { return []; }
  });
  const [location, setLocation] = useState<AppLocation | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('cf-location') || 'null') as AppLocation | null; } catch { return null; }
  });
  const [userName, setUserNameState] = useState(() => localStorage.getItem('cf-user') || 'مستخدم زائر');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('cf-theme') === 'dark');
  const [churches, setChurches] = useState<Church[]>(demoChurches);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(demoRestaurants);
  const [dataStatus, setDataStatus] = useState<DataStatus>(isBackendConfigured ? 'offline' : 'demo');
  const [dataMessage, setDataMessage] = useState(isBackendConfigured ? 'جارٍ الاتصال بقاعدة البيانات…' : 'وضع العرض: بيانات تجريبية. اربط Supabase لتشغيل الموقع الحقيقي.');
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(isBackendConfigured);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const applySession = useCallback(async (session: AuthSession | null) => {
    setAuthSession(session);
    if (!session) { setProfile(null); return; }
    try {
      const [remoteProfile, remoteFavorites] = await Promise.all([fetchProfile(session), loadFavorites(session)]);
      setProfile(remoteProfile);
      if (remoteProfile?.full_name) setUserNameState(remoteProfile.full_name);
      else if (session.user.user_metadata?.full_name || session.user.user_metadata?.name) setUserNameState(String(session.user.user_metadata.full_name || session.user.user_metadata.name));
      setFavorites(remoteFavorites);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحميل بيانات الحساب.';
      setFeedbackMessage(`تم تسجيل الدخول، لكن تعذر تحميل الملف الشخصي أو المفضلة: ${message}`);
    }
  }, []);

  const refreshPlaces = useCallback(async () => {
    if (!isBackendConfigured) {
      setChurches(demoChurches); setRestaurants(demoRestaurants); setDataStatus('demo');
      setDataMessage('وضع العرض: بيانات تجريبية. اربط Supabase لتشغيل الموقع الحقيقي.');
      return;
    }
    try {
      const [remoteChurches, remoteRestaurants, remoteEvents] = await Promise.all([loadPublicChurches(), loadPublicRestaurants(), loadPublicEvents().catch(() => [] as ChurchEvent[])]);
      setEvents(remoteEvents);
      if (remoteChurches === null || remoteRestaurants === null) throw new Error('لم يرجع خادم البيانات نتائج صالحة.');
      setChurches(remoteChurches);
      setRestaurants(remoteRestaurants);
      setDataStatus('live');
      setDataMessage(remoteChurches.length || remoteRestaurants.length
        ? 'متصل بقاعدة البيانات.'
        : 'قاعدة البيانات متصلة لكن لا توجد كنائس منشورة بعد. أضفها من لوحة الإدارة /admin.');
    } catch (error) {
      setChurches(demoChurches); setRestaurants(demoRestaurants); setDataStatus('offline');
      setDataMessage(`تعذر الوصول لقاعدة البيانات (تأكد من تشغيل ملفات SQL). ${error instanceof Error ? error.message : ''}`.trim());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cf-favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    if (location) sessionStorage.setItem('cf-location', JSON.stringify(location));
    else sessionStorage.removeItem('cf-location');
  }, [location]);
  useEffect(() => { localStorage.setItem('cf-user', userName); }, [userName]);
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('cf-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  useEffect(() => {
    let active = true;
    (async () => {
      await refreshPlaces();
      if (!isBackendConfigured) { setAuthLoading(false); return; }
      try {
        const session = await restoreAuthSession();
        if (active && session) await applySession(session);
      } catch {
        if (active) setFeedbackMessage('تعذر استعادة جلسة الحساب. سجّل الدخول مرة أخرى.');
      } finally { if (active) setAuthLoading(false); }
    })();
    return () => { active = false; };
  }, [applySession, refreshPlaces]);

  const refreshHelp = useCallback(async () => {
    if (!isBackendConfigured || dataStatus !== 'live') { setHelpRequests([]); return; }
    try { setHelpRequests(await loadHelpRequests(authSession)); } catch { setHelpRequests([]); }
  }, [authSession, dataStatus]);
  useEffect(() => { void refreshHelp(); }, [refreshHelp]);

  const toggleFavorite = useCallback((id: string) => {
    const removing = favorites.includes(id);
    setFavorites((items) => removing ? items.filter((value) => value !== id) : [...items, id]);
    if (!authSession || dataStatus !== 'live') return;
    const type = restaurants.some((item) => item.id === id) ? 'restaurant' : 'church';
    const request = removing ? removeFavorite(authSession, id, type) : addFavorite(authSession, id, type);
    request.catch((error: unknown) => {
      setFavorites((items) => removing ? [...items, id] : items.filter((value) => value !== id));
      setFeedbackMessage(`لم يتم حفظ التغيير في المفضلة على الخادم: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    });
  }, [authSession, dataStatus, favorites, restaurants]);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await signInWithPassword(email, password);
    await applySession(session);
    setFeedbackMessage('تم تسجيل الدخول بنجاح.');
  }, [applySession]);

  const signUp = useCallback(async (name: string, email: string, password: string, phone: string): Promise<RegisterResult> => {
    const result = await signUpWithPassword(email, password, name, phone);
    if (result.session) {
      await applySession(result.session);
      setFeedbackMessage('تم إنشاء الحساب بنجاح.');
    }
    return { confirmationRequired: result.confirmationRequired };
  }, [applySession]);

  const signOut = useCallback(async () => {
    try { await signOutRemote(authSession); }
    finally {
      setAuthSession(null); setProfile(null); setFavorites([]); setUserNameState('مستخدم زائر');
      setFeedbackMessage('تم تسجيل الخروج.');
    }
  }, [authSession]);

  const saveProfileName = useCallback(async (name: string) => {
    const cleaned = name.trim();
    if (cleaned.length < 2) throw new Error('الاسم يجب ألا يقل عن حرفين.');
    if (authSession && dataStatus === 'live') {
      const updated = await updateProfile(authSession, { full_name: cleaned });
      setProfile(updated);
    }
    setUserNameState(cleaned);
  }, [authSession, dataStatus]);

  const saveProfile = useCallback(async (fields: { full_name?: string; phone?: string; bio?: string; city?: string }) => {
    if (fields.full_name !== undefined && fields.full_name.trim().length < 2) throw new Error('الاسم يجب ألا يقل عن حرفين.');
    if (!authSession || dataStatus !== 'live') throw new Error('سجّل الدخول أولًا.');
    const updated = await updateProfile(authSession, fields);
    setProfile(updated);
    if (updated.full_name) setUserNameState(updated.full_name);
  }, [authSession, dataStatus]);
  const uploadAvatar = useCallback(async (file: File) => {
    if (!authSession) throw new Error('سجّل الدخول أولًا.');
    if (file.size > 3 * 1024 * 1024) throw new Error('حجم الصورة أكبر من 3 ميجا.');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const url = await uploadImage(authSession, `avatars/${authSession.user.id}/avatar.${ext}`, file);
    setProfile(await updateProfile(authSession, { avatar_url: url }));
  }, [authSession]);
  const sendHelp = useCallback(async (input: { title: string; details: string; category: string; contact_phone: string; church_id?: string | null }) => {
    if (!authSession) throw new Error('سجّل الدخول أولًا.');
    await submitHelpRequest(authSession, input);
    await refreshHelp();
  }, [authSession, refreshHelp]);

  const value = useMemo<AppState>(() => ({
    favorites, toggleFavorite, location, setLocation, userName, setUserName: setUserNameState,
    saveProfileName, saveProfile, uploadAvatar, events, helpRequests, refreshHelp, sendHelp, darkMode, setDarkMode, churches, restaurants, dataStatus, dataMessage,
    refreshPlaces, authSession, profile, isAuthenticated: Boolean(authSession?.access_token), authLoading,
    backendConfigured: isBackendConfigured, signIn, signUp, signOut, feedbackMessage,
    clearFeedback: () => setFeedbackMessage(''),
  }), [favorites, toggleFavorite, location, userName, saveProfileName, saveProfile, uploadAvatar, events, helpRequests, refreshHelp, sendHelp, darkMode, churches, restaurants, dataStatus, dataMessage, refreshPlaces, authSession, profile, authLoading, signIn, signUp, signOut, feedbackMessage]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() { const value = useContext(Context); if (!value) throw new Error('useApp must be used inside AppProvider'); return value; }
