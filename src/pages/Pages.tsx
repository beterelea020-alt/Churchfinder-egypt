import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Calendar, Camera, ChevronLeft, Cross, Heart, HandHeart, LocateFixed, LogOut, Map as MapIcon,
  MapPin, Navigation, Phone, Search, Settings, Share2, SlidersHorizontal, Utensils, Church as ChurchIcon, User, ShieldCheck, Clock3,
} from 'lucide-react';
import { denominations, governorates } from '../data/sampleData';
import { useApp } from '../context/AppContext';
import type { AppLocation, Coordinates } from '../types';
import { adminInsert, adminList, loadNearbyChurchIds, uploadImage } from '../lib/backend';
import { distanceKm, formatDistance } from '../utils/geo';
import MapView from '../components/MapView';
import { ChurchCard, Empty, OpenPill, PageTitle, Rating, RestaurantCard, imgFallback } from '../components/PlaceCard';
import { Avatar } from '../components/AppLayout';

const CAIRO: Coordinates = { lat: 30.0444, lng: 31.2357 };
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const HERO = 'https://images.unsplash.com/photo-1548625361-58a9b86aa83b?auto=format&fit=crop&w=900&q=80';
function getPosition(): Promise<AppLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('المتصفح لا يدعم تحديد الموقع.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'موقعي الحالي' }),
      (e) => reject(new Error(e.code === 1 ? 'لم يتم السماح بالوصول إلى الموقع.' : 'تعذر تحديد موقعك الآن.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
}
const BackBtn = ({ to }: { to?: string }) => { const nav = useNavigate(); return <button className="icon-round" onClick={() => (to ? nav(to) : nav(-1))} aria-label="رجوع"><ArrowRight size={18} /></button>; };

/* ---------- Welcome ---------- */
export function WelcomePage() {
  const nav = useNavigate();
  return <div className="shell"><div className="welcome" style={{ backgroundImage: `linear-gradient(180deg,rgba(14,32,60,.55),rgba(14,32,60,.25) 40%,rgba(14,32,60,.92)),url(${HERO})` }}>
    <div className="welcome-brand"><Cross size={42} strokeWidth={1.4} /><h1>ChurchFinder</h1><h2>اكتشف أقرب كنيسة لك</h2><p>في جميع محافظات مصر</p></div>
    <div className="welcome-actions"><button className="btn gold" onClick={() => nav('/auth')}>ابدأ الآن</button><button className="link-btn light" onClick={() => nav('/explore')}>تخطي</button></div>
  </div></div>;
}

/* ---------- Auth ---------- */
export function AuthPage() {
  const nav = useNavigate();
  const { signIn, signUp, backendConfigured } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '' });
  const [error, setError] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setOk('');
    if (!backendConfigured) { setError('الموقع لسه مش متوصل بـ Supabase. أضف المفاتيح في ملف .env.local أو في Vercel.'); return; }
    if (mode === 'register' && f.name.trim().length < 2) return setError('اكتب اسمك.');
    if (mode === 'register' && !/^[0-9+\s-]{8,16}$/.test(f.phone.trim())) return setError('اكتب رقم تليفون صحيح.');
    if (!f.email.includes('@')) return setError('اكتب بريدًا إلكترونيًا صحيحًا.');
    if (f.password.length < 6) return setError('كلمة المرور 6 أحرف على الأقل.');
    setBusy(true);
    try {
      if (mode === 'register') {
        const r = await signUp(f.name, f.email, f.password, f.phone);
        if (r.confirmationRequired) setOk('تم إنشاء الحساب. افتح بريدك وأكد الحساب ثم سجّل الدخول.'); else nav('/location');
      } else { await signIn(f.email, f.password); nav('/location'); }
    } catch (err) {
      const m = err instanceof Error ? err.message : '';
      setError(/invalid login/i.test(m) ? 'البريد أو كلمة المرور غير صحيحة.' : /not confirmed/i.test(m) ? 'أكد بريدك من الرسالة أولًا.' : /already/i.test(m) ? 'البريد مسجل من قبل، سجّل الدخول.' : m || 'حصل خطأ، حاول تاني.');
    } finally { setBusy(false); }
  }
  return <div className="shell"><div className="auth">
    <Cross size={40} className="gold-ic" strokeWidth={1.4} />
    <h1>{mode === 'login' ? 'مرحباً بك' : 'حساب جديد'}</h1>
    <p className="muted">{mode === 'login' ? 'سجّل دخولك للمتابعة أو أنشئ حساب جديد' : 'اكتب بياناتك وابدأ فورًا'}</p>
    <form onSubmit={submit} className="stack">
      {mode === 'register' && <><input placeholder="الاسم" value={f.name} onChange={set('name')} autoComplete="name" /><input placeholder="رقم التليفون" value={f.phone} onChange={set('phone')} inputMode="tel" dir="ltr" autoComplete="tel" /></>}
      <input type="email" placeholder="البريد الإلكتروني" value={f.email} onChange={set('email')} dir="ltr" autoComplete="email" />
      <input type="password" placeholder="كلمة المرور" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      {error && <p className="err">{error}</p>}{ok && <p className="good">{ok}</p>}
      <button className="btn navy" disabled={busy}>{busy ? 'لحظة...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button>
    </form>
    <button className="btn outline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setOk(''); }}>{mode === 'login' ? 'إنشاء حساب جديد' : 'عندي حساب بالفعل'}</button>
    <button className="link-btn" onClick={() => nav('/explore')}>المتابعة كزائر</button>
  </div></div>;
}

/* ---------- Location ---------- */
export function LocationPage() {
  const { setLocation } = useApp(); const nav = useNavigate(); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const manual = (v: string) => { setLocation(v === 'damietta' ? { lat: 31.4167, lng: 31.8133, label: 'دمياط' } : v === 'alex' ? { lat: 31.2001, lng: 29.9187, label: 'الإسكندرية' } : { ...CAIRO, label: 'القاهرة' }); nav('/explore'); };
  return <div className="shell"><div className="auth">
    <span className="loc-ic"><MapPin size={34} /></span><h1>مشاركة موقعك</h1><p className="muted">لمساعدتك في العثور على أقرب كنيسة</p>
    <div className="fake-map"><span className="fake-dot" /></div>
    <button className="btn navy" disabled={busy} onClick={async () => { setBusy(true); try { setLocation(await getPosition()); nav('/explore'); } catch (e) { setMsg(e instanceof Error ? e.message : 'خطأ'); } finally { setBusy(false); } }}>{busy ? 'جارٍ التحديد...' : 'مشاركة موقعي الحالي'}</button>
    <select defaultValue="" onChange={(e) => e.target.value && manual(e.target.value)}><option value="" disabled>أو اختر موقع بدوي</option><option value="cairo">القاهرة</option><option value="damietta">دمياط</option><option value="alex">الإسكندرية</option></select>
    {msg && <p className="err">{msg}</p>}
    <small className="muted">يمكنك تغيير موقعك لاحقًا من الإعدادات</small>
    <button className="link-btn" onClick={() => nav('/explore')}>تخطي</button>
  </div></div>;
}

/* ---------- Home ---------- */
export function ExplorePage() {
  const { location, setLocation, churches, events, dataStatus, authSession } = useApp();
  const [q, setQ] = useState(''); const [quick, setQuick] = useState('الكل'); const [sel, setSel] = useState(''); const [near, setNear] = useState<string[] | null>(null);
  useEffect(() => {
    if (quick !== 'قريبة مني' || !location || dataStatus !== 'live') { setNear(null); return; }
    let off = false; loadNearbyChurchIds(authSession, location.lat, location.lng, 15000).then((r) => !off && setNear(r.map((x) => x.id))).catch(() => !off && setNear(null));
    return () => { off = true; };
  }, [quick, location, dataStatus, authSession]);
  const list = useMemo(() => churches
    .filter((c) => `${c.name} ${c.address} ${c.governorate} ${c.neighborhood}`.includes(q.trim()))
    .filter((c) => quick !== 'مفتوحة الآن' || c.sampleOpen === true)
    .filter((c) => quick !== 'قريبة مني' || (location && (near ? near.includes(c.id) : distanceKm(location, c.coordinates) <= 15)))
    .sort((a, b) => (location ? distanceKm(location, a.coordinates) - distanceKm(location, b.coordinates) : 0)), [churches, q, quick, location, near]);
  const selected = list.find((c) => c.id === sel) || list[0];
  return <>
    <label className="search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن كنيسة أو منطقة..." /></label>
    <div className="chips">{['الكل', 'مفتوحة الآن', 'قريبة مني'].map((c) => <button key={c} className={`chip ${quick === c ? 'on' : ''}`} onClick={() => setQuick(c)}>{c}</button>)}<Link to="/filters" className="chip"><SlidersHorizontal size={13} /> تصفية</Link></div>
    <div className="map-box">
      <MapView places={list} center={location || selected?.coordinates || CAIRO} selectedId={selected?.id} onSelect={(p) => setSel(p.id)} userLocation={location} zoom={12} />
      <button className="locate" onClick={async () => { try { setLocation(await getPosition()); } catch { /* ignore */ } }} aria-label="موقعي"><LocateFixed size={18} /></button>
      {selected && <Link to={`/church/${selected.id}`} className="map-card"><img src={selected.image} alt="" onError={imgFallback} /><div><b>{selected.name}</b><OpenPill open={selected.sampleOpen} /><div className="row-meta">{location && <span className="dist">{formatDistance(distanceKm(location, selected.coordinates))}</span>}<Rating value={selected.rating} /></div></div></Link>}
    </div>
    {events.length > 0 && <section><div className="sec-head"><h2>اجتماعات وفعاليات</h2><Link to="/events">الكل</Link></div><div className="h-scroll">{events.slice(0, 6).map((e) => <div className="ev-chip" key={e.id}><Calendar size={15} /><b>{e.title}</b><small>{churches.find((c) => c.id === e.churchId)?.name || ''}</small><small>{[e.startsOn && new Date(e.startsOn).toLocaleDateString('ar-EG'), e.startsAt?.slice(0, 5)].filter(Boolean).join(' · ')}</small></div>)}</div></section>}
    <section><div className="sec-head"><h2>الكنائس القريبة منك</h2><Link to="/churches">عرض الكل</Link></div>
      {list.slice(0, 4).map((c) => <ChurchCard key={c.id} church={c} />)}{list.length === 0 && <Empty title="لا توجد نتائج" body="غيّر البحث أو الفلتر." />}</section>
    <Link to={`/suggest${q.trim() ? `?name=${encodeURIComponent(q.trim())}` : ''}`} className="suggest-cta"><ChurchIcon size={20} /><div><b>كنيستك مش موجودة؟</b><small>ضيفها وساعد غيرك يلاقوها</small></div><ChevronLeft size={17} /></Link>
  </>;
}

/* ---------- Churches list + filters ---------- */
export function ChurchesPage() {
  const [sp] = useSearchParams(); const { location, churches } = useApp(); const [q, setQ] = useState(''); const [tab, setTab] = useState(sp.get('availability') === 'open' ? 'open' : sp.get('availability') === 'closed' ? 'closed' : 'all');
  const gov = sp.get('governorate') || 'الكل'; const den = sp.get('denomination') || 'الكل'; const maxD = Number(sp.get('distance') || 0);
  const res = churches.filter((c) => `${c.name} ${c.address} ${c.neighborhood}`.includes(q.trim())).filter((c) => gov === 'الكل' || c.governorate === gov).filter((c) => den === 'الكل' || c.denomination === den)
    .filter((c) => tab === 'all' || (tab === 'open' ? c.sampleOpen === true : c.sampleOpen === false)).filter((c) => !maxD || !location || distanceKm(location, c.coordinates) <= maxD)
    .sort((a, b) => (location ? distanceKm(location, a.coordinates) - distanceKm(location, b.coordinates) : 0));
  return <>
    <div className="head-row"><BackBtn to="/explore" /><h1>الكنائس القريبة منك</h1><Link to="/filters" className="icon-round"><SlidersHorizontal size={17} /></Link></div>
    <label className="search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو المنطقة..." /></label>
    <div className="chips">{[['all', 'الكل'], ['open', 'متاحة الآن'], ['closed', 'مغلقة']].map(([k, l]) => <button key={k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}{(gov !== 'الكل' || den !== 'الكل' || maxD > 0) && <Link to="/churches" className="chip">مسح الفلاتر ✕</Link>}</div>
    {res.map((c) => <ChurchCard key={c.id} church={c} />)}{res.length === 0 && <Empty title="لا توجد كنائس مطابقة" />}
    <Link to={`/suggest${q.trim() ? `?name=${encodeURIComponent(q.trim())}` : ''}`} className="suggest-cta"><ChurchIcon size={20} /><div><b>كنيستك مش موجودة؟</b><small>ضيفها وساعد غيرك يلاقوها</small></div><ChevronLeft size={17} /></Link>
  </>;
}
export function FiltersPage() {
  const nav = useNavigate(); const [g, setG] = useState('الكل'); const [a, setA] = useState('all'); const [d, setD] = useState('الكل'); const [dist, setDist] = useState('0');
  return <><div className="head-row"><BackBtn /><h1>تصفية النتائج</h1><span /></div>
    <div className="card"><h3>حالة الكنيسة</h3>{[['all', 'الكل'], ['open', 'مفتوحة الآن'], ['closed', 'مغلقة']].map(([k, l]) => <label className="check" key={k}><input type="radio" checked={a === k} onChange={() => setA(k)} />{l}</label>)}</div>
    <div className="card"><h3>المحافظة</h3><select value={g} onChange={(e) => setG(e.target.value)}>{governorates.map((x) => <option key={x}>{x}</option>)}</select></div>
    <div className="card"><h3>الطائفة</h3><select value={d} onChange={(e) => setD(e.target.value)}><option>الكل</option>{denominations.map((x) => <option key={x}>{x}</option>)}</select></div>
    <div className="card"><h3>المسافة (يحتاج موقعك)</h3><div className="chips">{[['0', 'أي مسافة'], ['5', '5 كم'], ['10', '10 كم'], ['25', '25 كم']].map(([k, l]) => <button key={k} className={`chip ${dist === k ? 'on' : ''}`} onClick={() => setDist(k)}>{l}</button>)}</div></div>
    <button className="btn navy" onClick={() => nav(`/churches?${new URLSearchParams({ governorate: g, availability: a, denomination: d, distance: dist })}`)}>تطبيق الفلتر</button></>;
}

/* ---------- Church details ---------- */
export function ChurchDetailsPage() {
  const { id } = useParams(); const nav = useNavigate(); const { churches, events, favorites, toggleFavorite, location } = useApp();
  const c = churches.find((x) => x.id === id); const [msg, setMsg] = useState('');
  if (!c) return <div style={{ padding: 20 }}><Empty title="الكنيسة غير موجودة" action={<Link className="btn navy" to="/churches">رجوع</Link>} /></div>;
  const fav = favorites.includes(c.id); const evs = events.filter((e) => e.churchId === c.id);
  const share = async () => { const url = `https://www.google.com/maps?q=${c.coordinates.lat},${c.coordinates.lng}`; try { if (navigator.share) await navigator.share({ title: c.name, text: c.address, url }); else { await navigator.clipboard.writeText(url); setMsg('تم نسخ رابط الموقع'); } } catch { /* cancelled */ } };
  return <>
    <div className="hero"><img src={c.image} alt="" onError={imgFallback} /><div className="hero-fade" /><button className="icon-round float-r" onClick={() => nav(-1)} aria-label="رجوع"><ArrowRight size={18} /></button><button className={`icon-round float-l ${fav ? 'heart on' : ''}`} onClick={() => toggleFavorite(c.id)} aria-label="المفضلة"><Heart size={18} fill={fav ? 'currentColor' : 'none'} /></button></div>
    <div className="sheet">
      <h1>{c.name}</h1><p className="muted">{c.neighborhood} - {c.governorate}</p>
      <div className="row-meta"><OpenPill open={c.sampleOpen} /><Rating value={c.rating} />{location && <span className="dist">{formatDistance(distanceKm(location, c.coordinates))}</span>}</div>
      <div className="actions">
        {c.phone ? <a href={`tel:${c.phone}`} className="act"><span><Phone size={20} /></span>الاتصال</a> : <span className="act off"><span><Phone size={20} /></span>الاتصال</span>}
        <button className="act" onClick={share}><span><Share2 size={20} /></span>مشاركة الموقع</button>
        <button className={`act ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(c.id)}><span><Heart size={20} fill={fav ? 'currentColor' : 'none'} /></span>{fav ? 'في المفضلة' : 'إضافة للمفضلة'}</button>
      </div>
      {msg && <p className="good">{msg}</p>}
      {c.description && <p className="desc">{c.description}</p>}
      <div className="card"><h3>تفاصيل الكنيسة</h3>
        <div className="kv"><span>الطائفة</span><b>{c.denomination}</b></div>
        <div className="kv"><span>الخدمة</span><b>{c.services.join('، ') || '—'}</b></div>
        <div className="kv"><span>العنوان</span><b>{c.address}</b></div>
        {c.phone && <div className="kv"><span>الهاتف</span><b dir="ltr">{c.phone}</b></div>}
        {c.facilities.length > 0 && <div className="kv"><span>المرافق</span><b>{c.facilities.join('، ')}</b></div>}
      </div>
      {(c.scheduleEntries?.length || c.openingHours) ? <div className="card"><h3>المواعيد</h3>
        {c.scheduleEntries?.map((s) => <div className="kv" key={s.id}><span>{s.title}</span><b>{s.dayOfWeek === null ? '' : DAYS[s.dayOfWeek]} {s.startsAt?.slice(0, 5)}{s.endsAt ? `–${s.endsAt.slice(0, 5)}` : ''}</b></div>)}
        {c.openingHours && Object.entries(c.openingHours).map(([d, h]) => <div className="kv" key={d}><span>{d}</span><b>{h}</b></div>)}
        {c.scheduleNote && !c.scheduleEntries?.length && <p className="muted">{c.scheduleNote}</p>}</div> : null}
      {evs.length > 0 && <div className="card"><h3>اجتماعات وفعاليات</h3>{evs.map((e) => <div className="kv" key={e.id}><span>{e.kind}: {e.title}</span><b>{[e.startsOn && new Date(e.startsOn).toLocaleDateString('ar-EG'), e.startsAt?.slice(0, 5)].filter(Boolean).join(' · ')}</b></div>)}</div>}
      <Link to={`/route/${c.id}`} className="btn navy"><Navigation size={17} /> الاتجاهات</Link>
    </div></>;
}

/* ---------- Route ---------- */
export function RoutePage() {
  const { id } = useParams(); const { churches, restaurants, location, setLocation } = useApp();
  const p = [...churches, ...restaurants].find((x) => x.id === id);
  const [route, setRoute] = useState<{ pts: [number, number][]; km: number; min: number } | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const start: Coordinates = location || CAIRO;
  useEffect(() => {
    if (!p) return; let off = false; setBusy(true); setErr(''); setRoute(null);
    fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${p.coordinates.lng},${p.coordinates.lat}?overview=full&geometries=geojson`).then((r) => r.json())
      .then((d: { code?: string; routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] }) => { const r = d.routes?.[0]; if (!r) throw new Error('x'); if (!off) setRoute({ pts: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), km: r.distance / 1000, min: r.duration / 60 }); })
      .catch(() => !off && setErr('تعذر حساب المسار الآن، تقدر تفتح الملاحة بالزر تحت.')).finally(() => !off && setBusy(false));
    return () => { off = true; };
  }, [p?.id, start.lat, start.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return <div style={{ padding: 20 }}><Empty title="المكان غير موجود" action={<Link className="btn navy" to="/explore">رجوع</Link>} /></div>;
  return <>
    <div className="head-row pad"><BackBtn /><h1>الاتجاهات</h1><span /></div>
    <div className="card route-card"><div className="kv"><span>من</span><b>{location?.label || 'القاهرة (حدد موقعك لدقة أكبر)'}</b></div><div className="kv"><span>إلى</span><b>{p.name}</b></div>
      <div className="stats"><div><b>{route ? route.km.toFixed(1) : busy ? '…' : '—'}</b><small>كم</small></div><div><b>{route ? Math.round(route.min) : busy ? '…' : '—'}</b><small>دقيقة</small></div></div>
      {!location && <button className="btn outline" onClick={async () => { try { setLocation(await getPosition()); } catch (e) { setErr(e instanceof Error ? e.message : ''); } }}><LocateFixed size={16} /> استخدم موقعي</button>}</div>
    <div className="map-box tall"><MapView places={[p]} center={route ? p.coordinates : start} userLocation={start} route={route?.pts || null} zoom={route ? 11 : 12} /></div>
    {err && <p className="err" style={{ padding: '0 16px' }}>{err}</p>}
    <div style={{ padding: 16 }}><a className="btn navy" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&origin=${start.lat},${start.lng}&destination=${p.coordinates.lat},${p.coordinates.lng}&travelmode=driving`}><Navigation size={17} /> ابدأ الملاحة عبر GPS</a></div>
  </>;
}

/* ---------- Map ---------- */
export function MapSearchPage() {
  const { location, churches, restaurants, setLocation } = useApp(); const [q, setQ] = useState(''); const [sel, setSel] = useState(''); const [show, setShow] = useState<'all' | 'open' | 'closed' | 'food'>('all');
  const cs = churches.filter((c) => `${c.name} ${c.neighborhood} ${c.governorate}`.includes(q.trim())).filter((c) => show === 'all' || show === 'food' || (show === 'open' ? c.sampleOpen === true : c.sampleOpen === false));
  const places = [...(show === 'food' ? [] : cs), ...((show === 'all' || show === 'food') ? restaurants.filter((r) => r.name.includes(q.trim())) : [])];
  const s = cs.find((c) => c.id === sel);
  return <div className="full-map">
    <MapView places={places} center={location || cs[0]?.coordinates || CAIRO} selectedId={sel} onSelect={(x) => setSel(x.id)} userLocation={location} zoom={11} />
    <label className="search float"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن كنيسة أو منطقة..." /></label>
    <button className="locate" onClick={async () => { try { setLocation(await getPosition()); } catch { /* ignore */ } }} aria-label="موقعي"><LocateFixed size={18} /></button>
    {s && <Link to={`/church/${s.id}`} className="map-card"><img src={s.image} alt="" onError={imgFallback} /><div><b>{s.name}</b><OpenPill open={s.sampleOpen} /></div></Link>}
    <div className="legend">{([['all', 'الكل'], ['open', 'مفتوحة'], ['closed', 'مغلقة'], ['food', 'مطاعم']] as const).map(([k, l]) => <button key={k} className={`chip ${show === k ? 'on' : ''}`} onClick={() => setShow(k)}>{l}</button>)}</div>
  </div>;
}

/* ---------- Restaurants & Favorites ---------- */
export function RestaurantsPage() {
  const { restaurants, location } = useApp(); const [q, setQ] = useState(''); const [cat, setCat] = useState('الكل');
  const cats = ['الكل', ...Array.from(new Set(restaurants.map((r) => r.category)))];
  const res = restaurants.filter((r) => `${r.name} ${r.address}`.includes(q.trim())).filter((r) => cat === 'الكل' || r.category === cat).sort((a, b) => (location ? distanceKm(location, a.coordinates) - distanceKm(location, b.coordinates) : 0));
  return <><PageTitle title="المطاعم القريبة" /><label className="search"><Search size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مطعم..." /></label>
    <div className="chips">{cats.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
    {res.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}{res.length === 0 && <Empty title="لا توجد مطاعم" />}</>;
}
export function FavoritesPage() {
  const { favorites, churches, restaurants } = useApp(); const [tab, setTab] = useState<'c' | 'r'>('c');
  const fc = churches.filter((c) => favorites.includes(c.id)); const fr = restaurants.filter((r) => favorites.includes(r.id));
  return <><PageTitle title="المفضلة" /><div className="seg"><button className={tab === 'c' ? 'on' : ''} onClick={() => setTab('c')}>الكنائس ({fc.length})</button><button className={tab === 'r' ? 'on' : ''} onClick={() => setTab('r')}>المطاعم ({fr.length})</button></div>
    {tab === 'c' ? (fc.length ? fc.map((c) => <ChurchCard key={c.id} church={c} />) : <Empty title="لم تحفظ كنائس بعد" body="اضغط على القلب في أي كنيسة." />) : (fr.length ? fr.map((r) => <RestaurantCard key={r.id} restaurant={r} />) : <Empty title="لم تحفظ مطاعم بعد" />)}</>;
}

/* ---------- Events & Help ---------- */
export function EventsPage() {
  const { events, churches } = useApp();
  return <><div className="head-row"><BackBtn to="/more" /><h1>الاجتماعات والفعاليات</h1><span /></div>
    {events.map((e) => { const ch = churches.find((c) => c.id === e.churchId); return <div className="card" key={e.id}><div className="row-top"><h3>{e.title}</h3><span className="pill neutral">{e.kind}</span></div>
      {ch && <p className="row-sub"><Link to={`/church/${ch.id}`}><ChurchIcon size={12} /> {ch.name}</Link></p>}
      <p className="row-sub"><Clock3 size={12} /> {[e.startsOn && new Date(e.startsOn).toLocaleDateString('ar-EG'), e.startsAt?.slice(0, 5)].filter(Boolean).join(' · ') || 'الموعد غير محدد'}</p>{e.description && <p className="desc">{e.description}</p>}</div>; })}
    {events.length === 0 && <Empty title="لا توجد اجتماعات حاليًا" body="الأدمن بيضيفها من لوحة الإدارة." />}</>;
}
export function HelpPage() {
  const { helpRequests, churches, isAuthenticated, sendHelp, authSession, profile } = useApp();
  const [f, setF] = useState({ title: '', details: '', category: 'أخرى', contact_phone: profile?.phone || '', church_id: '' }); const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const pub = helpRequests.filter((h) => h.isPublished); const mine = helpRequests.filter((h) => h.userId === authSession?.user.id && !h.isPublished);
  async function submit(e: FormEvent) { e.preventDefault(); setErr(''); setMsg(''); if (f.title.trim().length < 3) return setErr('اكتب عنوان للطلب.'); setBusy(true); try { await sendHelp(f); setMsg('تم إرسال طلبك للإدارة.'); setF({ ...f, title: '', details: '' }); } catch (x) { setErr(x instanceof Error ? x.message : 'تعذر الإرسال'); } finally { setBusy(false); } }
  return <><div className="head-row"><BackBtn to="/more" /><h1>المساعدات</h1><span /></div>
    <div className="card"><h3>اطلب مساعدة</h3>{isAuthenticated ? <form className="stack" onSubmit={submit}>
      <input placeholder="عنوان الطلب" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{['مالية', 'غذائية', 'طبية', 'تعليمية', 'أخرى'].map((x) => <option key={x}>{x}</option>)}</select>
      <select value={f.church_id} onChange={(e) => setF({ ...f, church_id: e.target.value })}><option value="">كنيسة (اختياري)</option>{churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input placeholder="رقم للتواصل" dir="ltr" value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} />
      <textarea rows={3} placeholder="التفاصيل" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
      {err && <p className="err">{err}</p>}{msg && <p className="good">{msg}</p>}<button className="btn navy" disabled={busy}>إرسال</button></form> : <><p className="muted">سجّل الدخول لإرسال طلب.</p><Link to="/auth" className="btn navy">تسجيل الدخول</Link></>}</div>
    {mine.length > 0 && <div className="card"><h3>طلباتي (بانتظار الإدارة)</h3>{mine.map((h) => <div className="kv" key={h.id}><span>{h.title}</span><b>{h.status === 'done' ? 'تم' : 'قيد المراجعة'}</b></div>)}</div>}
    <h2 className="sec-title">طلبات مساعدة معلنة</h2>
    {pub.map((h) => <div className="card" key={h.id}><div className="row-top"><h3>{h.title}</h3><span className="pill neutral">{h.category}</span></div>{h.details && <p className="desc">{h.details}</p>}{h.contactPhone && <a className="btn outline" href={`tel:${h.contactPhone}`}><Phone size={15} /> تواصل</a>}</div>)}
    {pub.length === 0 && <Empty title="لا توجد طلبات معلنة" />}</>;
}

/* ---------- More ---------- */
export function MorePage() {
  const { profile } = useApp();
  const items = [
    { icon: ChurchIcon, t: 'اقترح كنيسة', d: 'كنيستك مش موجودة؟ ضيفها', to: '/suggest' },
    { icon: Calendar, t: 'الاجتماعات والفعاليات', d: 'اجتماعات الكنائس القادمة', to: '/events' },
    { icon: HandHeart, t: 'المساعدات', d: 'اطلب أو شوف طلبات المساعدة', to: '/help' },
    { icon: Utensils, t: 'مطاعم حول الكنيسة', d: 'مطاعم وكافيهات قريبة', to: '/restaurants' },
    { icon: MapPin, t: 'جميع محافظات مصر', d: 'تصفية الكنائس بالمحافظة', to: '/filters' },
    { icon: Heart, t: 'المفضلة', d: 'الأماكن المحفوظة', to: '/favorites' },
    { icon: User, t: 'حسابي', d: 'بياناتي وصورتي', to: '/profile' },
    ...(profile?.role === 'admin' ? [{ icon: Settings, t: 'لوحة الإدارة', d: 'التحكم الكامل في المنصة', to: '/admin' }] : []),
  ];
  return <><PageTitle title="المزيد" />{items.map(({ icon: I, t, d, to }) => <Link key={to} to={to} className="menu-row"><span className="menu-ic"><I size={19} /></span><div><b>{t}</b><small>{d}</small></div><ChevronLeft size={17} /></Link>)}
    <p className="muted center">✝ Faith Guides You</p></>;
}

/* ---------- Profile ---------- */
export function ProfilePage() {
  const { isAuthenticated, profile, authSession, userName, saveProfile, uploadAvatar, signOut, darkMode, setDarkMode, helpRequests } = useApp();
  const nav = useNavigate(); const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ full_name: '', phone: '', city: '', bio: '' }); const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) setF({ full_name: profile.full_name || '', phone: profile.phone || '', city: profile.city || '', bio: profile.bio || '' }); }, [profile]);
  if (!isAuthenticated) return <><PageTitle title="حسابي" /><Empty title="أنت زائر" body="سجّل الدخول عشان تكمل بياناتك وتضيف صورتك." action={<Link className="btn navy" to="/auth">تسجيل الدخول / حساب جديد</Link>} /></>;
  const save = async () => { setBusy(true); setErr(''); setMsg(''); try { await saveProfile(f); setMsg('تم الحفظ.'); } catch (e) { setErr(e instanceof Error ? e.message : 'تعذر الحفظ'); } finally { setBusy(false); } };
  const pick = async (file?: File) => { if (!file) return; setErr(''); try { await uploadAvatar(file); setMsg('تم تغيير الصورة.'); } catch (e) { setErr(e instanceof Error ? e.message : 'تعذر رفع الصورة (تأكد من تشغيل ملف SQL الثاني)'); } };
  return <>
    <div className="profile-head"><button className="avatar-btn" onClick={() => fileRef.current?.click()} aria-label="تغيير الصورة"><Avatar size={88} /><span><Camera size={14} /></span></button><input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => void pick(e.target.files?.[0])} />
      <h2>{userName}</h2><p className="muted">{profile?.role === 'admin' ? 'مشرف النظام' : 'مستخدم'}</p></div>
    <div className="card"><h3>معلوماتي</h3><div className="stack">
      <label className="lbl">الاسم<input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
      <label className="lbl">رقم التليفون<input dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
      <label className="lbl">المدينة<input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
      <label className="lbl">نبذة عني<textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></label>
      <p className="muted" dir="ltr" style={{ textAlign: 'right' }}>{authSession?.user.email}</p>
      {err && <p className="err">{err}</p>}{msg && <p className="good">{msg}</p>}<button className="btn navy" disabled={busy} onClick={save}>{busy ? '...' : 'حفظ'}</button></div></div>
    <Link to="/help" className="menu-row"><span className="menu-ic"><HandHeart size={19} /></span><div><b>طلبات المساعدة</b><small>{helpRequests.filter((h) => h.userId === authSession?.user.id).length} طلب مني</small></div><ChevronLeft size={17} /></Link>
    <div className="menu-row"><span className="menu-ic"><ShieldCheck size={19} /></span><div><b>المظهر الداكن</b></div><button className={`toggle ${darkMode ? 'on' : ''}`} onClick={() => setDarkMode(!darkMode)} aria-label="المظهر الداكن"><i /></button></div>
    <Link to="/location" className="menu-row"><span className="menu-ic"><MapIcon size={19} /></span><div><b>تغيير موقعي</b></div><ChevronLeft size={17} /></Link>
    {profile?.role === 'admin' && <Link to="/admin" className="menu-row"><span className="menu-ic"><Settings size={19} /></span><div><b>لوحة الإدارة</b><small>تحكم كامل</small></div><ChevronLeft size={17} /></Link>}
    <button className="btn danger" onClick={async () => { await signOut(); nav('/explore'); }}><LogOut size={16} /> تسجيل الخروج</button>
  </>;
}

/* ---------- Suggest a missing church ---------- */
type Sub = { id: string; name: string; status: 'pending' | 'approved' | 'rejected'; admin_note: string | null };
export function SuggestChurchPage() {
  const { isAuthenticated, authSession, profile, location } = useApp(); const nav = useNavigate(); const [sp] = useSearchParams();
  const [f, setF] = useState({ name: sp.get('name') || '', governorate: 'القاهرة', neighborhood: '', address: '', denomination: 'الأرثوذكسية القبطية', phone: '', services: '', schedule_text: '', description: '' });
  const [pos, setPos] = useState<Coordinates | null>(null); const [photo, setPhoto] = useState<File | null>(null); const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false); const [mine, setMine] = useState<Sub[]>([]);
  useEffect(() => { if (authSession) adminList<Sub>(authSession, 'church_submissions').then(setMine).catch(() => setMine([])); }, [authSession, done]);
  useEffect(() => { if (!photo) { setPreview(''); return; } const u = URL.createObjectURL(photo); setPreview(u); return () => URL.revokeObjectURL(u); }, [photo]);
  if (!isAuthenticated || !authSession) return <><div className="head-row"><BackBtn /><h1>اقترح كنيسة</h1><span /></div><Empty title="سجّل الدخول الأول" body="عشان نقدر نراجع الطلب ونكلمك لو احتجنا." action={<Link className="btn navy" to="/auth">تسجيل الدخول / حساب جديد</Link>} /></>;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  async function here() { setErr(''); try { const l = await getPosition(); setPos({ lat: l.lat, lng: l.lng }); } catch (e) { setErr(e instanceof Error ? e.message : 'تعذر تحديد الموقع'); } }
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr('');
    if (f.name.trim().length < 3) return setErr('اكتب اسم الكنيسة.');
    if (!pos) return setErr('اضغط «استخدم موقعي الحالي» وانت قريب من الكنيسة، أو الأدمن هيحدد الموقع بعد كده.');
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (photo) { if (photo.size > 5 * 1024 * 1024) throw new Error('الصورة أكبر من 5 ميجا.'); const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, ''); image_url = await uploadImage(authSession!, `submissions/${authSession!.user.id}/${Date.now()}.${ext}`, photo); }
      await adminInsert(authSession!, 'church_submissions', { ...f, name: f.name.trim(), latitude: pos.lat, longitude: pos.lng, image_url, user_id: authSession!.user.id, submitter_name: profile?.full_name || null, submitter_phone: profile?.phone || null });
      setDone(true);
    } catch (x) { setErr(x instanceof Error ? x.message : 'تعذر الإرسال'); } finally { setBusy(false); }
  }
  if (done) return <div className="auth"><span className="loc-ic"><ChurchIcon size={32} /></span><h1>شكرًا ليك 🙏</h1><p className="muted">طلبك وصل للإدارة، وأول ما نراجعه الكنيسة هتظهر للناس.</p><button className="btn navy" onClick={() => { setDone(false); setF({ ...f, name: '', address: '', services: '', schedule_text: '', description: '', phone: '' }); setPhoto(null); setPos(null); }}>اقترح كنيسة تانية</button><button className="link-btn" onClick={() => nav('/explore')}>رجوع للرئيسية</button></div>;
  return <>
    <div className="head-row"><BackBtn /><h1>اقترح كنيسة</h1><span /></div>
    <p className="muted" style={{ marginBottom: 12 }}>كنيستك مش موجودة؟ ضيفها وانت اللي تساعد غيرك يلاقوها. الإدارة بتراجع الطلب وبتنشره.</p>
    <form className="stack" onSubmit={submit}>
      <label className="lbl">اسم الكنيسة *<input value={f.name} onChange={set('name')} placeholder="مثال: كنيسة مار جرجس" /></label>
      <div className="two"><label className="lbl">المحافظة<select value={f.governorate} onChange={set('governorate')}>{governorates.filter((g) => g !== 'الكل').map((g) => <option key={g}>{g}</option>)}</select></label>
        <label className="lbl">المنطقة / الحي<input value={f.neighborhood} onChange={set('neighborhood')} /></label></div>
      <label className="lbl">العنوان بالتفصيل<input value={f.address} onChange={set('address')} /></label>
      <label className="lbl">الطائفة<select value={f.denomination} onChange={set('denomination')}>{denominations.map((d) => <option key={d}>{d}</option>)}</select></label>
      <label className="lbl">رقم تليفون الكنيسة (لو تعرفه)<input dir="ltr" value={f.phone} onChange={set('phone')} /></label>
      <label className="lbl">الخدمات<input value={f.services} onChange={set('services')} placeholder="قداسات، مدارس أحد، خدمة شباب..." /></label>
      <label className="lbl">مواعيد القداسات والاجتماعات<textarea rows={3} value={f.schedule_text} onChange={set('schedule_text')} placeholder="مثال: قداس الأحد 7 ص، اجتماع شباب الجمعة 7 م" /></label>
      <label className="lbl">معلومات تانية<textarea rows={2} value={f.description} onChange={set('description')} /></label>
      <div className="card"><h3>الموقع على الخريطة *</h3>
        {pos ? <p className="good">تم تحديد الموقع ✓ ({pos.lat.toFixed(4)}, {pos.lng.toFixed(4)})</p> : <p className="muted">أحسن حاجة تكون واقف عند الكنيسة وتدوس الزرار.</p>}
        <button type="button" className="btn outline" onClick={here}><LocateFixed size={16} /> {pos ? 'حدّث موقعي' : 'استخدم موقعي الحالي'}</button>
        {location && !pos && <button type="button" className="link-btn" onClick={() => setPos({ lat: location.lat, lng: location.lng })}>استخدم موقعي المحفوظ</button>}</div>
      <div className="card"><h3>صورة الكنيسة</h3>{preview && <img src={preview} alt="" style={{ width: '100%', borderRadius: 14, marginBottom: 8 }} />}
        <label className="btn outline"><Camera size={16} /> {photo ? 'غيّر الصورة' : 'صوّر أو اختار صورة'}<input hidden type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] || null)} /></label></div>
      {err && <p className="err">{err}</p>}
      <button className="btn navy" disabled={busy}>{busy ? 'جاري الإرسال...' : 'إرسال للإدارة'}</button>
    </form>
    {mine.length > 0 && <div className="card" style={{ marginTop: 16 }}><h3>طلباتي</h3>{mine.map((m) => <div className="kv" key={m.id}><span>{m.name}</span><b>{m.status === 'approved' ? 'تم النشر ✓' : m.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</b></div>)}</div>}
  </>;
}
