import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Building2, CheckCircle2, CircleAlert, ClipboardCheck, Edit3, MapPin, Plus, RefreshCw, Save, Trash2, Utensils, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AdminExtras from './AdminExtras';
import {
  uploadImage, adminCreatePlace, adminCreateService, adminDeletePlace, adminDeleteService, adminLoadPlaces,
  adminLoadPlacesRestaurants, adminLoadServices, adminUpdatePlace, adminUpdateService,
  type AdminChurchRecord, type AdminRestaurantRecord, type AdminServiceRecord, type PlaceInput,
} from '../lib/backend';

type Tab = 'churches' | 'restaurants' | 'services' | 'events' | 'help' | 'users' | 'submissions';
type PlaceForm = {
  name: string; address: string; governorate: string; neighborhood: string; denomination: string;
  category: string; latitude: string; longitude: string; image_url: string; description: string; phone: string; opening_hours: string;
  services: string; facilities: string; service_notes: string; price_range: string; is_open: 'unknown' | 'open' | 'closed';
  verified: boolean; is_published: boolean; source_name: string; source_url: string; rating: string;
};
const blankPlace: PlaceForm = {
  name: '', address: '', governorate: 'دمياط', neighborhood: '', denomination: 'الأرثوذكسية القبطية', category: 'مطعم',
  latitude: '31.4167', longitude: '31.8133', image_url: '', description: '', phone: '', services: '', facilities: '',
  service_notes: '', opening_hours: '{}', price_range: '', is_open: 'unknown', verified: false, is_published: true, source_name: '', source_url: '', rating: '',
};
type ServiceForm = { church_id: string; title: string; day_of_week: string; starts_at: string; ends_at: string; notes: string; is_verified: boolean; is_published: boolean; source_name: string; source_url: string };
const blankService: ServiceForm = { church_id: '', title: '', day_of_week: '', starts_at: '', ends_at: '', notes: '', is_verified: false, is_published: false, source_name: '', source_url: '' };

function fieldValue(value: string | null | undefined) { return value || ''; }
function showDate(value?: string) { return value ? new Date(value).toLocaleDateString('ar-EG') : '—'; }

export default function AdminPage() {
  const { authSession, profile, authLoading, backendConfigured, dataStatus, refreshPlaces } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('churches');
  const [churchRows, setChurchRows] = useState<AdminChurchRecord[]>([]);
  const [restaurantRows, setRestaurantRows] = useState<AdminRestaurantRecord[]>([]);
  const [serviceRows, setServiceRows] = useState<AdminServiceRecord[]>([]);
  const [placeForm, setPlaceForm] = useState<PlaceForm>(blankPlace);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(blankService);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceEditingId, setServiceEditingId] = useState<string | null>(null);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAdminData = useCallback(async () => {
    if (!authSession || profile?.role !== 'admin') return;
    setBusy(true); setError('');
    try {
      const [churches, restaurants, services] = await Promise.all([
        adminLoadPlaces(authSession, 'churches'), adminLoadPlacesRestaurants(authSession), adminLoadServices(authSession),
      ]);
      setChurchRows(churches); setRestaurantRows(restaurants); setServiceRows(services);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات الإدارة. تأكد من تطبيق migration وصلاحيات المشرف.'); }
    finally { setBusy(false); }
  }, [authSession, profile?.role]);

  useEffect(() => { if (profile?.role === 'admin') void loadAdminData(); }, [loadAdminData, profile?.role]);
  useEffect(() => { if (!authLoading && !authSession) navigate('/auth', { replace: true }); }, [authLoading, authSession, navigate]);

  if (authLoading) return <div className="content-page"><div className="content-card admin-state"><RefreshCw size={24} /><h1>جارٍ التحقق من حساب المشرف</h1></div></div>;
  if (!authSession) return null;
  if (!backendConfigured || dataStatus !== 'live') return <div className="content-page"><div className="admin-page"><Link to="/profile" className="text-link"><ArrowRight size={15} /> العودة للملف الشخصي</Link><div className="content-card admin-state"><CircleAlert size={28} /><h1>الباك إند غير متاح</h1><p>لوحة الإدارة تحتاج إلى إعداد Supabase وتشغيل ملف SQL بنجاح قبل استخدامها.</p></div></div></div>;
  if (!profile || profile.role !== 'admin') return <div className="content-page"><div className="admin-page"><Link to="/profile" className="text-link"><ArrowRight size={15} /> العودة للملف الشخصي</Link><div className="content-card admin-state"><CircleAlert size={28} /><h1>ليس لديك صلاحية المشرف</h1><p>الحساب الحالي ليس مشرفًا. أنشئ حسابك أولًا ثم عيّن role = admin له يدويًا من Supabase SQL Editor باتباع دليل README.</p></div></div></div>;

  async function pickImage(file?: File) {
    if (!file || !authSession) return; setBusy(true); setError('');
    try { const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, ''); const url = await uploadImage(authSession, `places/${Date.now()}.${ext}`, file); setPlaceForm((f) => ({ ...f, image_url: url })); setNotice('تم رفع الصورة. اضغط حفظ السجل.'); }
    catch (e) { setError((e instanceof Error ? e.message : 'تعذر رفع الصورة') + ' — تأكد من تشغيل ملف SQL الثاني.'); } finally { setBusy(false); }
  }
  function startCreatePlace() { setEditingId(null); setPlaceForm({ ...blankPlace }); setShowPlaceForm(true); setError(''); setNotice(''); }
  function startEditChurch(item: AdminChurchRecord) {
    setEditingId(item.id); setTab('churches'); setShowPlaceForm(true); setError(''); setNotice('');
    setPlaceForm({ ...blankPlace, name: item.name, address: item.address, governorate: item.governorate, neighborhood: fieldValue(item.neighborhood), denomination: fieldValue(item.denomination), latitude: String(item.latitude), longitude: String(item.longitude), image_url: fieldValue(item.image_url), description: fieldValue(item.description), phone: fieldValue(item.phone), services: (item.services || []).join(', '), facilities: (item.facilities || []).join(', '), service_notes: fieldValue(item.service_notes), opening_hours: JSON.stringify(item.opening_hours || {}, null, 2), is_open: item.is_open === true ? 'open' : item.is_open === false ? 'closed' : 'unknown', verified: item.verified, is_published: item.is_published, source_name: fieldValue(item.source_name), source_url: fieldValue(item.source_url), rating: item.rating ? String(item.rating) : '' });
  }
  function startEditRestaurant(item: AdminRestaurantRecord) {
    setEditingId(item.id); setTab('restaurants'); setShowPlaceForm(true); setError(''); setNotice('');
    setPlaceForm({ ...blankPlace, name: item.name, address: item.address, governorate: item.governorate, category: item.category, latitude: String(item.latitude), longitude: String(item.longitude), image_url: fieldValue(item.image_url), phone: fieldValue(item.phone), price_range: fieldValue(item.price_range), verified: item.verified, is_published: item.is_published, source_name: fieldValue(item.source_name), source_url: fieldValue(item.source_url), rating: item.rating ? String(item.rating) : '' });
  }
  async function savePlace(event: FormEvent) {
    event.preventDefault(); if (!authSession) return;
    const placeType: 'churches' | 'restaurants' = tab === 'restaurants' ? 'restaurants' : 'churches';
    const latitude = Number(placeForm.latitude); const longitude = Number(placeForm.longitude);
    if (!placeForm.name.trim() || !placeForm.address.trim() || !placeForm.governorate.trim()) { setError('الاسم والعنوان والمحافظة حقول مطلوبة.'); return; }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) { setError('أدخل إحداثيات صحيحة بين -90 و90 لخط العرض و-180 و180 لخط الطول.'); return; }
    let parsedOpeningHours: Record<string, string> | undefined;
    if (placeType === 'churches') { try { const parsed: unknown = JSON.parse(placeForm.opening_hours || '{}'); if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) || Object.values(parsed).some((value) => typeof value !== 'string')) throw new Error('أدخل كائن JSON تكون قيمه نصوصًا، مثل {\"الأحد\":\"09:00-12:00\"}.'); parsedOpeningHours = parsed as Record<string, string>; } catch (e) { setError(e instanceof Error ? `تنسيق مواعيد العمل غير صحيح: ${e.message}` : 'تنسيق مواعيد العمل غير صحيح.'); return; } }
    setBusy(true); setError(''); setNotice('');
    try {
      const input: PlaceInput = {
        name: placeForm.name.trim(), address: placeForm.address.trim(), governorate: placeForm.governorate.trim(), latitude, longitude,
        image_url: placeForm.image_url.trim() || undefined, phone: placeForm.phone.trim() || undefined,
        verified: placeForm.verified, is_published: placeForm.is_published, rating: placeForm.rating ? Math.min(5, Math.max(0, Number(placeForm.rating))) : null, source_name: placeForm.source_name.trim() || undefined, source_url: placeForm.source_url.trim() || undefined,
      };
      if (placeType === 'churches') Object.assign(input, {
        neighborhood: placeForm.neighborhood.trim() || undefined, denomination: placeForm.denomination.trim() || undefined,
        description: placeForm.description.trim() || undefined, services: placeForm.services.split(',').map((v) => v.trim()).filter(Boolean),
        facilities: placeForm.facilities.split(',').map((v) => v.trim()).filter(Boolean), service_notes: placeForm.service_notes.trim() || undefined, opening_hours: parsedOpeningHours || {},
        is_open: placeForm.is_open === 'unknown' ? null : placeForm.is_open === 'open',
      });
      else Object.assign(input, { category: placeForm.category.trim() || 'غير محدد', price_range: placeForm.price_range.trim() || undefined });
      if (editingId) await adminUpdatePlace(authSession, placeType, editingId, input);
      else await adminCreatePlace(authSession, placeType, input);
      setNotice(editingId ? 'تم تحديث السجل.' : 'تم إنشاء السجل.'); setShowPlaceForm(false); setEditingId(null);
      await loadAdminData(); await refreshPlaces();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ السجل.'); }
    finally { setBusy(false); }
  }
  async function deletePlace(type: 'churches' | 'restaurants', id: string) {
    if (!authSession || !window.confirm('هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن الحذف.')) return;
    setBusy(true); setError(''); setNotice('');
    try { await adminDeletePlace(authSession, type, id); setNotice('تم حذف السجل.'); await loadAdminData(); await refreshPlaces(); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر حذف السجل.'); }
    finally { setBusy(false); }
  }
  function editService(item: AdminServiceRecord) {
    setServiceEditingId(item.id); setServiceForm({ church_id: item.church_id, title: item.title, day_of_week: item.day_of_week === null ? '' : String(item.day_of_week), starts_at: item.starts_at || '', ends_at: item.ends_at || '', notes: item.notes || '', is_verified: item.is_verified, is_published: item.is_published, source_name: item.source_name || '', source_url: item.source_url || '' }); setShowServiceForm(true); setError(''); setNotice('');
  }
  async function saveService(event: FormEvent) {
    event.preventDefault(); if (!authSession) return;
    if (!serviceForm.church_id || !serviceForm.title.trim()) { setError('اختر كنيسة واكتب اسم الخدمة.'); return; }
    setBusy(true); setError(''); setNotice('');
    const payload = { church_id: serviceForm.church_id, title: serviceForm.title.trim(), day_of_week: serviceForm.day_of_week === '' ? null : Number(serviceForm.day_of_week), starts_at: serviceForm.starts_at || null, ends_at: serviceForm.ends_at || null, notes: serviceForm.notes.trim() || null, is_verified: serviceForm.is_verified, is_published: serviceForm.is_published, source_name: serviceForm.source_name.trim() || null, source_url: serviceForm.source_url.trim() || null };
    try {
      if (serviceEditingId) await adminUpdateService(authSession, serviceEditingId, payload);
      else await adminCreateService(authSession, payload as Omit<AdminServiceRecord, 'id' | 'verified_at'>);
      setShowServiceForm(false); setServiceEditingId(null); setServiceForm({ ...blankService }); setNotice('تم حفظ بيانات الخدمة.'); await loadAdminData();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ الخدمة.'); }
    finally { setBusy(false); }
  }
  async function deleteService(id: string) {
    if (!authSession || !window.confirm('حذف الخدمة نهائيًا؟')) return;
    setBusy(true); setError('');
    try { await adminDeleteService(authSession, id); setNotice('تم حذف الخدمة.'); await loadAdminData(); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر حذف الخدمة.'); }
    finally { setBusy(false); }
  }

  return <div className="content-page admin-page">
    <div className="breadcrumb"><Link to="/explore">الرئيسية</Link><span>‹</span><span>لوحة الإدارة</span></div>
    <div className="admin-title-row"><div><span className="eyebrow">إدارة الدليل والمحتوى</span><h1>لوحة تحكم المشرف</h1><p>إضافة السجلات ومراجعة المصادر ونشر البيانات بعد التحقق منها.</p></div><button className="btn btn-outline" onClick={() => void loadAdminData()} disabled={busy}><RefreshCw size={16} /> تحديث البيانات</button></div>
    <div className="admin-data-warning"><ClipboardCheck size={20} /><div><b>أنت المتحكم في كل المحتوى</b><p>أي كنيسة أو مطعم أو خدمة أو اجتماع تضيفه هنا بيظهر للمستخدمين فورًا لو علّمت «نشر». ارفع صورة، حدّد حالة الفتح والتقييم، وعدّل في أي وقت.</p></div></div>
    <div className="admin-stats"><div className="content-card"><Building2 size={20}/><span>سجلات الكنائس</span><b>{churchRows.length}</b></div><div className="content-card"><Utensils size={20}/><span>سجلات المطاعم</span><b>{restaurantRows.length}</b></div><div className="content-card"><ClipboardCheck size={20}/><span>الخدمات والقداسات</span><b>{serviceRows.length}</b></div></div>
    <div className="admin-tabs"><button className={tab === 'churches' ? 'active' : ''} onClick={() => { setTab('churches'); setShowPlaceForm(false); }}>الكنائس</button><button className={tab === 'restaurants' ? 'active' : ''} onClick={() => { setTab('restaurants'); setShowPlaceForm(false); }}>المطاعم</button><button className={tab === 'services' ? 'active' : ''} onClick={() => { setTab('services'); setShowPlaceForm(false); setShowServiceForm(false); }}>الخدمات والمواعيد</button><button className={tab === 'submissions' ? 'active' : ''} onClick={() => { setTab('submissions'); setShowPlaceForm(false); }}>طلبات الكنائس</button><button className={tab === 'events' ? 'active' : ''} onClick={() => { setTab('events'); setShowPlaceForm(false); }}>الاجتماعات</button><button className={tab === 'help' ? 'active' : ''} onClick={() => { setTab('help'); setShowPlaceForm(false); }}>المساعدات</button><button className={tab === 'users' ? 'active' : ''} onClick={() => { setTab('users'); setShowPlaceForm(false); }}>المستخدمون</button></div>
    {(tab === 'events' || tab === 'help' || tab === 'users' || tab === 'submissions') && authSession && <AdminExtras session={authSession} churches={churchRows} view={tab} onPublished={() => { void loadAdminData(); void refreshPlaces(); }} />}
    {error && <div className="inline-error" role="alert">{error}</div>}{notice && <div className="inline-success" role="status"><CheckCircle2 size={16}/>{notice}</div>}
    {(tab === 'churches' || tab === 'restaurants') && <div className="admin-toolbar"><h2>{tab === 'churches' ? 'إدارة الكنائس' : 'إدارة المطاعم'}</h2><button className="btn btn-primary" onClick={startCreatePlace}><Plus size={17}/> إضافة {tab === 'churches' ? 'كنيسة' : 'مطعم'}</button></div>}
    {tab === 'churches' && <div className="content-card admin-table-wrap"><table className="admin-table"><thead><tr><th>الاسم</th><th>المحافظة</th><th>التوثيق</th><th>النشر</th><th>آخر تحديث</th><th>إجراءات</th></tr></thead><tbody>{churchRows.map((item) => <tr key={item.id}><td><b>{item.name}</b><small>{item.address}</small></td><td>{item.governorate}</td><td><span className={`admin-status ${item.verified ? 'good' : ''}`}>{item.verified ? 'موثقة' : 'غير موثقة'}</span></td><td><span className={`admin-status ${item.is_published ? 'good' : ''}`}>{item.is_published ? 'منشورة' : 'مسودة'}</span></td><td>{showDate(item.updated_at)}</td><td><div className="admin-row-actions"><button aria-label="تعديل الكنيسة" title="تعديل" onClick={() => startEditChurch(item)}><Edit3 size={16}/></button><button aria-label="حذف الكنيسة" title="حذف" onClick={() => void deletePlace('churches', item.id)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{churchRows.length === 0 && <div className="admin-empty">لا توجد كنائس مسجلة بعد. أضف سجلًا بمصدر موثوق ثم حدّد هل ينشر للعامة.</div>}</div>}
    {tab === 'restaurants' && <div className="content-card admin-table-wrap"><table className="admin-table"><thead><tr><th>الاسم</th><th>المحافظة</th><th>الفئة</th><th>التوثيق</th><th>النشر</th><th>إجراءات</th></tr></thead><tbody>{restaurantRows.map((item) => <tr key={item.id}><td><b>{item.name}</b><small>{item.address}</small></td><td>{item.governorate}</td><td>{item.category}</td><td><span className={`admin-status ${item.verified ? 'good' : ''}`}>{item.verified ? 'موثق' : 'غير موثق'}</span></td><td><span className={`admin-status ${item.is_published ? 'good' : ''}`}>{item.is_published ? 'منشور' : 'مسودة'}</span></td><td><div className="admin-row-actions"><button aria-label="تعديل المطعم" title="تعديل" onClick={() => startEditRestaurant(item)}><Edit3 size={16}/></button><button aria-label="حذف المطعم" title="حذف" onClick={() => void deletePlace('restaurants', item.id)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{restaurantRows.length === 0 && <div className="admin-empty">لا توجد مطاعم مسجلة بعد.</div>}</div>}
    {tab === 'services' && <><div className="admin-toolbar"><h2>الخدمات والقداسات</h2><button className="btn btn-primary" onClick={() => { setServiceEditingId(null); setServiceForm({ ...blankService, church_id: churchRows[0]?.id || '' }); setShowServiceForm(true); setError(''); setNotice(''); }}><Plus size={17}/> إضافة خدمة أو موعد</button></div><div className="content-card admin-table-wrap"><table className="admin-table"><thead><tr><th>الخدمة</th><th>الكنيسة</th><th>اليوم والوقت</th><th>التوثيق</th><th>النشر</th><th>إجراءات</th></tr></thead><tbody>{serviceRows.map((item) => <tr key={item.id}><td><b>{item.title}</b><small>{item.notes || ''}</small></td><td>{churchRows.find((church) => church.id === item.church_id)?.name || 'كنيسة غير معروفة'}</td><td>{item.day_of_week === null ? 'اليوم غير محدد' : ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][item.day_of_week]} {item.starts_at ? `${item.starts_at.slice(0,5)}${item.ends_at ? `–${item.ends_at.slice(0,5)}` : ''}` : ''}</td><td><span className={`admin-status ${item.is_verified ? 'good' : ''}`}>{item.is_verified ? 'موثقة' : 'غير موثقة'}</span></td><td><span className={`admin-status ${item.is_published ? 'good' : ''}`}>{item.is_published ? 'منشورة' : 'مسودة'}</span></td><td><div className="admin-row-actions"><button title="تعديل" aria-label="تعديل الخدمة" onClick={() => editService(item)}><Edit3 size={16}/></button><button title="حذف" aria-label="حذف الخدمة" onClick={() => void deleteService(item.id)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{serviceRows.length === 0 && <div className="admin-empty">لم تضف خدمات أو مواعيد بعد. لن يتم عرض أي موعد للجمهور إلا بعد نشره.</div>}</div></>}

    {showPlaceForm && <div className="content-card admin-form-card"><div className="admin-form-heading"><div><span className="eyebrow">{editingId ? 'تعديل سجل' : 'سجل جديد'}</span><h2>{editingId ? 'تعديل البيانات' : `إضافة ${tab === 'churches' ? 'كنيسة' : 'مطعم'}`}</h2></div><button className="icon-button" onClick={() => setShowPlaceForm(false)} aria-label="إغلاق النموذج"><X size={18}/></button></div><form className="admin-form-grid" onSubmit={savePlace}>
      <label>الاسم *<input value={placeForm.name} onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })} required /></label><label>المحافظة *<input value={placeForm.governorate} onChange={(e) => setPlaceForm({ ...placeForm, governorate: e.target.value })} required /></label><label className="wide">العنوان *<input value={placeForm.address} onChange={(e) => setPlaceForm({ ...placeForm, address: e.target.value })} required /></label>
      {tab === 'churches' ? <><label>الحي أو المنطقة<input value={placeForm.neighborhood} onChange={(e) => setPlaceForm({ ...placeForm, neighborhood: e.target.value })}/></label><label>الطائفة<input value={placeForm.denomination} onChange={(e) => setPlaceForm({ ...placeForm, denomination: e.target.value })}/></label><label className="wide">الوصف<textarea value={placeForm.description} onChange={(e) => setPlaceForm({ ...placeForm, description: e.target.value })} rows={3}/></label><label>الخدمات (افصل بفاصلة)<input value={placeForm.services} onChange={(e) => setPlaceForm({ ...placeForm, services: e.target.value })}/></label><label>المرافق (افصل بفاصلة)<input value={placeForm.facilities} onChange={(e) => setPlaceForm({ ...placeForm, facilities: e.target.value })}/></label><label className="wide">ملاحظة المواعيد<input value={placeForm.service_notes} onChange={(e) => setPlaceForm({ ...placeForm, service_notes: e.target.value })}/></label><label className="wide">مواعيد العمل بصيغة JSON<textarea rows={3} value={placeForm.opening_hours} onChange={(e) => setPlaceForm({ ...placeForm, opening_hours: e.target.value })}/><small className="admin-field-note">مثال: {`{"الأحد":"09:00-12:00","الاثنين":"مغلق"}`}</small></label><label>حالة الفتح<select value={placeForm.is_open} onChange={(e) => setPlaceForm({ ...placeForm, is_open: e.target.value as PlaceForm['is_open'] })}><option value="unknown">غير معروفة</option><option value="open">مفتوحة</option><option value="closed">مغلقة</option></select></label></> : <><label>الفئة<input value={placeForm.category} onChange={(e) => setPlaceForm({ ...placeForm, category: e.target.value })}/></label><label>نطاق السعر<input value={placeForm.price_range} onChange={(e) => setPlaceForm({ ...placeForm, price_range: e.target.value })} placeholder="يُترك فارغًا إن لم يكن موثقًا"/></label></>}
      <label>خط العرض *<input type="number" step="any" value={placeForm.latitude} onChange={(e) => setPlaceForm({ ...placeForm, latitude: e.target.value })} required dir="ltr"/></label><label>خط الطول *<input type="number" step="any" value={placeForm.longitude} onChange={(e) => setPlaceForm({ ...placeForm, longitude: e.target.value })} required dir="ltr"/></label><label>رابط الصورة<input type="url" value={placeForm.image_url} onChange={(e) => setPlaceForm({ ...placeForm, image_url: e.target.value })} dir="ltr"/><input type="file" accept="image/*" onChange={(e) => void pickImage(e.target.files?.[0])} /></label><label>التقييم (0 - 5)<input type="number" step="0.1" min="0" max="5" value={placeForm.rating} onChange={(e) => setPlaceForm({ ...placeForm, rating: e.target.value })} dir="ltr"/></label><label>الهاتف<input type="tel" value={placeForm.phone} onChange={(e) => setPlaceForm({ ...placeForm, phone: e.target.value })} dir="ltr"/></label><label>اسم المصدر<input value={placeForm.source_name} onChange={(e) => setPlaceForm({ ...placeForm, source_name: e.target.value })} placeholder="مثال: موقع رسمي"/></label><label>رابط المصدر<input type="url" value={placeForm.source_url} onChange={(e) => setPlaceForm({ ...placeForm, source_url: e.target.value })} dir="ltr"/></label>
      <div className="admin-checks"><label><input type="checkbox" checked={placeForm.verified} onChange={(e) => setPlaceForm({ ...placeForm, verified: e.target.checked })}/> تم التحقق من البيانات</label><label><input type="checkbox" checked={placeForm.is_published} onChange={(e) => setPlaceForm({ ...placeForm, is_published: e.target.checked })}/> نشر السجل للعامة</label></div><div className="admin-form-actions"><button type="submit" className="btn btn-primary" disabled={busy}><Save size={16}/>{busy ? 'جارٍ الحفظ...' : 'حفظ السجل'}</button><button type="button" className="btn btn-outline" onClick={() => setShowPlaceForm(false)}>إلغاء</button></div>
    </form></div>}

    {showServiceForm && <div className="content-card admin-form-card"><div className="admin-form-heading"><div><span className="eyebrow">إدارة المواعيد</span><h2>{serviceEditingId ? 'تعديل خدمة أو موعد' : 'إضافة خدمة أو موعد'}</h2></div><button className="icon-button" onClick={() => setShowServiceForm(false)} aria-label="إغلاق النموذج"><X size={18}/></button></div><form className="admin-form-grid" onSubmit={saveService}><label className="wide">الكنيسة *<select value={serviceForm.church_id} onChange={(e) => setServiceForm({ ...serviceForm, church_id: e.target.value })} required><option value="">اختر الكنيسة</option>{churchRows.map((church) => <option key={church.id} value={church.id}>{church.name} — {church.governorate}</option>)}</select></label><label className="wide">اسم الخدمة أو القداس *<input value={serviceForm.title} onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })} required /></label><label>اليوم<select value={serviceForm.day_of_week} onChange={(e) => setServiceForm({ ...serviceForm, day_of_week: e.target.value })}><option value="">غير محدد</option>{['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, i) => <option key={day} value={i}>{day}</option>)}</select></label><label>وقت البداية<input type="time" value={serviceForm.starts_at} onChange={(e) => setServiceForm({ ...serviceForm, starts_at: e.target.value })}/></label><label>وقت النهاية<input type="time" value={serviceForm.ends_at} onChange={(e) => setServiceForm({ ...serviceForm, ends_at: e.target.value })}/></label><label>اسم المصدر<input value={serviceForm.source_name} onChange={(e) => setServiceForm({ ...serviceForm, source_name: e.target.value })}/></label><label className="wide">رابط المصدر<input type="url" value={serviceForm.source_url} onChange={(e) => setServiceForm({ ...serviceForm, source_url: e.target.value })} dir="ltr"/></label><label className="wide">ملاحظات<textarea rows={3} value={serviceForm.notes} onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}/></label><div className="admin-checks"><label><input type="checkbox" checked={serviceForm.is_verified} onChange={(e) => setServiceForm({ ...serviceForm, is_verified: e.target.checked })}/> تم التحقق من الموعد</label><label><input type="checkbox" checked={serviceForm.is_published} onChange={(e) => setServiceForm({ ...serviceForm, is_published: e.target.checked })}/> نشر الموعد للعامة</label></div><div className="admin-form-actions"><button type="submit" className="btn btn-primary" disabled={busy || churchRows.length === 0}><Save size={16}/>{busy ? 'جارٍ الحفظ...' : 'حفظ الموعد'}</button><button type="button" className="btn btn-outline" onClick={() => setShowServiceForm(false)}>إلغاء</button></div></form></div>}
    {busy && <p className="admin-busy-note">جارٍ تنفيذ العملية…</p>}
  </div>;
}
