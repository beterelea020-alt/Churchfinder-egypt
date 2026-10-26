import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Edit3, Plus, Save, Trash2, Check } from 'lucide-react';
import { adminInsert, adminList, adminPatch, adminRemove, type AdminChurchRecord, type AuthSession, type UserProfile } from '../lib/backend';

type Ev = { id: string; church_id: string | null; title: string; kind: string; description: string | null; starts_on: string | null; starts_at: string | null; location_note: string | null; is_published: boolean };
type Help = { id: string; church_id: string | null; user_id: string | null; title: string; details: string | null; category: string; contact_phone: string | null; status: 'open' | 'in_progress' | 'done'; is_published: boolean; created_at: string };
type Sub = { id: string; name: string; address: string | null; governorate: string | null; neighborhood: string | null; denomination: string | null; latitude: number | null; longitude: number | null; phone: string | null; services: string | null; schedule_text: string | null; description: string | null; image_url: string | null; submitter_name: string | null; submitter_phone: string | null; status: 'pending' | 'approved' | 'rejected'; admin_note: string | null; created_at: string };
const statusLabel = { open: 'جديد', in_progress: 'جاري', done: 'تم' } as const;
const blankEv = { church_id: '', title: '', kind: 'اجتماع', description: '', starts_on: '', starts_at: '', location_note: '', is_published: true };
const blankHelp = { church_id: '', title: '', details: '', category: 'أخرى', contact_phone: '', status: 'open' as Help['status'], is_published: true };

export default function AdminExtras({ session, churches, view, onPublished }: { session: AuthSession; churches: AdminChurchRecord[]; view: 'events' | 'help' | 'users' | 'submissions'; onPublished?: () => void }) {
  const [evs, setEvs] = useState<Ev[]>([]); const [helps, setHelps] = useState<Help[]>([]); const [users, setUsers] = useState<UserProfile[]>([]); const [subs, setSubs] = useState<Sub[]>([]); const [sf, setSf] = useState<Sub | null>(null);
  const [evForm, setEvForm] = useState(blankEv); const [hpForm, setHpForm] = useState(blankHelp); const [editId, setEditId] = useState<string | null>(null); const [open, setOpen] = useState(false);
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const cname = (id: string | null) => churches.find((c) => c.id === id)?.name || '—';

  const load = useCallback(async () => {
    setErr('');
    try {
      if (view === 'events') setEvs(await adminList<Ev>(session, 'church_events', 'starts_on.desc.nullslast'));
      if (view === 'help') setHelps(await adminList<Help>(session, 'help_requests'));
      if (view === 'submissions') setSubs(await adminList<Sub>(session, 'church_submissions'));
      if (view === 'users') setUsers(await adminList<UserProfile>(session, 'profiles'));
    } catch (e) { setErr((e instanceof Error ? e.message : 'تعذر التحميل') + ' — تأكد إنك شغلت ملف SQL الثاني (202610230002).'); }
  }, [session, view]);
  useEffect(() => { setOpen(false); setEditId(null); setOk(''); void load(); }, [load]);

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setOk('');
    try {
      if (view === 'events') {
        if (!evForm.title.trim()) throw new Error('اكتب عنوان الاجتماع.');
        const body = { ...evForm, title: evForm.title.trim(), church_id: evForm.church_id || null, starts_on: evForm.starts_on || null, starts_at: evForm.starts_at || null, description: evForm.description || null, location_note: evForm.location_note || null };
        if (editId) await adminPatch(session, 'church_events', editId, body); else await adminInsert(session, 'church_events', body);
      } else {
        if (!hpForm.title.trim()) throw new Error('اكتب عنوان الطلب.');
        const body = { ...hpForm, title: hpForm.title.trim(), church_id: hpForm.church_id || null, details: hpForm.details || null, contact_phone: hpForm.contact_phone || null };
        if (editId) await adminPatch(session, 'help_requests', editId, body); else await adminInsert(session, 'help_requests', body);
      }
      setOk('تم الحفظ.'); setOpen(false); setEditId(null); await load();
    } catch (x) { setErr(x instanceof Error ? x.message : 'تعذر الحفظ'); } finally { setBusy(false); }
  }
  async function publishSub(e: FormEvent) {
    e.preventDefault(); if (!sf) return; setBusy(true); setErr(''); setOk('');
    try {
      if (sf.latitude === null || sf.longitude === null) throw new Error('الإحداثيات ناقصة (latitude / longitude).');
      const list = (t: string | null) => (t || '').split(/[,،\n]/).map((x) => x.trim()).filter(Boolean);
      await adminInsert(session, 'churches', { name: sf.name.trim(), address: sf.address?.trim() || sf.neighborhood || sf.governorate || '—', neighborhood: sf.neighborhood || null, governorate: sf.governorate || 'القاهرة', denomination: sf.denomination || null, latitude: Number(sf.latitude), longitude: Number(sf.longitude), phone: sf.phone || null, image_url: sf.image_url || null, description: sf.description || null, service_notes: sf.schedule_text || null, services: list(sf.services), facilities: [], is_published: true, verified: false });
      await adminPatch(session, 'church_submissions', sf.id, { status: 'approved' });
      setOk('تم النشر ✓ الكنيسة ظاهرة للناس دلوقتي.'); setSf(null); await load(); onPublished?.();
    } catch (x) { setErr(x instanceof Error ? x.message : 'تعذر النشر'); } finally { setBusy(false); }
  }
  async function remove(table: string, id: string) { if (!window.confirm('حذف نهائي؟')) return; try { await adminRemove(session, table, id); await load(); } catch (x) { setErr(x instanceof Error ? x.message : 'تعذر الحذف'); } }
  async function patch(table: string, id: string, body: Record<string, unknown>) { try { await adminPatch(session, table, id, body); await load(); } catch (x) { setErr(x instanceof Error ? x.message : 'تعذر التعديل'); } }

  return <>
    {err && <div className="inline-error" role="alert">{err}</div>}{ok && <div className="inline-success">{ok}</div>}
    {view === 'submissions' && <div className="admin-toolbar"><h2>طلبات إضافة كنائس ({subs.filter((x) => x.status === 'pending').length} جديد)</h2></div>}
    {view === 'submissions' && !sf && <div className="content-card admin-table-wrap"><table className="admin-table"><thead><tr><th>الكنيسة</th><th>المرسل</th><th>الحالة</th><th /></tr></thead><tbody>{subs.map((r) => <tr key={r.id}><td><b>{r.name}</b><small>{[r.governorate, r.neighborhood].filter(Boolean).join(' - ')}</small></td><td>{r.submitter_name || '—'}<small dir="ltr">{r.submitter_phone || ''}</small></td><td><span className={`admin-status ${r.status === 'approved' ? 'good' : ''}`}>{r.status === 'pending' ? 'جديد' : r.status === 'approved' ? 'منشور' : 'مرفوض'}</span></td><td><div className="admin-row-actions">{r.status !== 'approved' && <button title="مراجعة ونشر" onClick={() => setSf(r)}><Edit3 size={16} /></button>}{r.status === 'pending' && <button title="رفض" onClick={() => void patch('church_submissions', r.id, { status: 'rejected' })}>✕</button>}<button title="حذف" onClick={() => void remove('church_submissions', r.id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{subs.length === 0 && <div className="admin-empty">لا توجد طلبات.</div>}</div>}
    {view === 'submissions' && sf && <div className="content-card admin-form-card"><form className="admin-form-grid" onSubmit={publishSub}>
      {sf.image_url && <img className="wide" src={sf.image_url} alt="" style={{ maxHeight: 220, borderRadius: 14, objectFit: 'cover' }} />}
      <label className="wide">الاسم<input value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} /></label>
      <label>المحافظة<input value={sf.governorate || ''} onChange={(e) => setSf({ ...sf, governorate: e.target.value })} /></label><label>المنطقة<input value={sf.neighborhood || ''} onChange={(e) => setSf({ ...sf, neighborhood: e.target.value })} /></label>
      <label className="wide">العنوان<input value={sf.address || ''} onChange={(e) => setSf({ ...sf, address: e.target.value })} /></label>
      <label>الطائفة<input value={sf.denomination || ''} onChange={(e) => setSf({ ...sf, denomination: e.target.value })} /></label><label>التليفون<input dir="ltr" value={sf.phone || ''} onChange={(e) => setSf({ ...sf, phone: e.target.value })} /></label>
      <label>Latitude<input dir="ltr" type="number" step="any" value={sf.latitude ?? ''} onChange={(e) => setSf({ ...sf, latitude: e.target.value === '' ? null : Number(e.target.value) })} /></label><label>Longitude<input dir="ltr" type="number" step="any" value={sf.longitude ?? ''} onChange={(e) => setSf({ ...sf, longitude: e.target.value === '' ? null : Number(e.target.value) })} /></label>
      <label className="wide">الخدمات (بفاصلة)<input value={sf.services || ''} onChange={(e) => setSf({ ...sf, services: e.target.value })} /></label>
      <label className="wide">المواعيد<textarea rows={2} value={sf.schedule_text || ''} onChange={(e) => setSf({ ...sf, schedule_text: e.target.value })} /></label>
      <label className="wide">الوصف<textarea rows={2} value={sf.description || ''} onChange={(e) => setSf({ ...sf, description: e.target.value })} /></label>
      <div className="admin-form-actions"><button className="btn primary" disabled={busy}><Check size={15} /> نشر</button><button type="button" className="btn outline" onClick={() => setSf(null)}>رجوع</button></div></form></div>}
    {view !== 'users' && view !== 'submissions' && <div className="admin-toolbar"><h2>{view === 'events' ? 'الاجتماعات والفعاليات' : 'طلبات المساعدة'}</h2><button className="btn primary" onClick={() => { setEditId(null); setEvForm(blankEv); setHpForm(blankHelp); setOpen(true); }}><Plus size={16} /> إضافة</button></div>}

    {view === 'events' && <div className="content-card admin-table-wrap"><table className="admin-table"><thead><tr><th>العنوان</th><th>الكنيسة</th><th>الموعد</th><th>النشر</th><th /></tr></thead><tbody>{evs.map((r) => <tr key={r.id}><td><b>{r.title}</b><small>{r.kind}</small></td><td>{cname(r.church_id)}</td><td>{r.starts_on || '—'} {r.starts_at?.slice(0, 5) || ''}</td><td><span className={`admin-status ${r.is_published ? 'good' : ''}`}>{r.is_published ? 'منشور' : 'مخفي'}</span></td>
      <td><div className="admin-row-actions"><button title="تعديل" onClick={() => { setEditId(r.id); setEvForm({ church_id: r.church_id || '', title: r.title, kind: r.kind, description: r.description || '', starts_on: r.starts_on || '', starts_at: r.starts_at || '', location_note: r.location_note || '', is_published: r.is_published }); setOpen(true); }}><Edit3 size={16} /></button><button title="حذف" onClick={() => void remove('church_events', r.id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{evs.length === 0 && <div className="admin-empty">لا توجد اجتماعات. اضغط إضافة.</div>}</div>}

    {view === 'help' && <div className="content-card admin-table-wrap"><table className="admin-table"><thead><tr><th>الطلب</th><th>من</th><th>الحالة</th><th>النشر</th><th /></tr></thead><tbody>{helps.map((r) => <tr key={r.id}><td><b>{r.title}</b><small>{r.category} · {r.details?.slice(0, 60) || ''}</small>{r.contact_phone && <small dir="ltr">{r.contact_phone}</small>}</td><td>{r.user_id ? 'مستخدم' : 'الإدارة'} · {cname(r.church_id)}</td>
      <td><select value={r.status} onChange={(e) => void patch('help_requests', r.id, { status: e.target.value })}>{(Object.keys(statusLabel) as Help['status'][]).map((k) => <option key={k} value={k}>{statusLabel[k]}</option>)}</select></td>
      <td><button className={`admin-status ${r.is_published ? 'good' : ''}`} onClick={() => void patch('help_requests', r.id, { is_published: !r.is_published })}>{r.is_published ? 'منشور ✓' : 'نشر'}</button></td>
      <td><div className="admin-row-actions"><button title="تعديل" onClick={() => { setEditId(r.id); setHpForm({ church_id: r.church_id || '', title: r.title, details: r.details || '', category: r.category, contact_phone: r.contact_phone || '', status: r.status, is_published: r.is_published }); setOpen(true); }}><Edit3 size={16} /></button><button title="حذف" onClick={() => void remove('help_requests', r.id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{helps.length === 0 && <div className="admin-empty">لا توجد طلبات.</div>}</div>}

    {view === 'users' && <div className="content-card admin-table-wrap"><table className="admin-table"><thead><tr><th>الاسم</th><th>التليفون</th><th>الإيميل</th><th>الصلاحية</th></tr></thead><tbody>{users.map((u) => <tr key={u.id}><td><b>{u.full_name || '—'}</b><small>{u.city || ''}</small></td><td dir="ltr">{u.phone || '—'}</td><td dir="ltr">{u.email || '—'}</td>
      <td><select value={u.role} onChange={(e) => { if (window.confirm('تغيير صلاحية المستخدم؟')) void patch('profiles', u.id, { role: e.target.value }); }}><option value="user">مستخدم</option><option value="admin">أدمن</option></select></td></tr>)}</tbody></table>{users.length === 0 && <div className="admin-empty">لا يوجد مستخدمون.</div>}</div>}

    {open && view === 'events' && <div className="content-card admin-form-card"><form className="admin-form-grid" onSubmit={save}>
      <label className="wide">العنوان *<input value={evForm.title} onChange={(e) => setEvForm({ ...evForm, title: e.target.value })} required /></label>
      <label>النوع<select value={evForm.kind} onChange={(e) => setEvForm({ ...evForm, kind: e.target.value })}>{['اجتماع', 'قداس خاص', 'فعالية', 'خدمة', 'رحلة', 'مؤتمر'].map((k) => <option key={k}>{k}</option>)}</select></label>
      <label>الكنيسة<select value={evForm.church_id} onChange={(e) => setEvForm({ ...evForm, church_id: e.target.value })}><option value="">عام (بدون كنيسة)</option>{churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>التاريخ<input type="date" value={evForm.starts_on} onChange={(e) => setEvForm({ ...evForm, starts_on: e.target.value })} /></label><label>الوقت<input type="time" value={evForm.starts_at} onChange={(e) => setEvForm({ ...evForm, starts_at: e.target.value })} /></label>
      <label className="wide">مكان / ملاحظة<input value={evForm.location_note} onChange={(e) => setEvForm({ ...evForm, location_note: e.target.value })} /></label>
      <label className="wide">التفاصيل<textarea rows={3} value={evForm.description} onChange={(e) => setEvForm({ ...evForm, description: e.target.value })} /></label>
      <div className="admin-checks"><label><input type="checkbox" checked={evForm.is_published} onChange={(e) => setEvForm({ ...evForm, is_published: e.target.checked })} /> نشر للمستخدمين</label></div>
      <div className="admin-form-actions"><button className="btn primary" disabled={busy}><Save size={15} /> حفظ</button><button type="button" className="btn outline" onClick={() => setOpen(false)}>إلغاء</button></div></form></div>}

    {open && view === 'help' && <div className="content-card admin-form-card"><form className="admin-form-grid" onSubmit={save}>
      <label className="wide">العنوان *<input value={hpForm.title} onChange={(e) => setHpForm({ ...hpForm, title: e.target.value })} required /></label>
      <label>التصنيف<select value={hpForm.category} onChange={(e) => setHpForm({ ...hpForm, category: e.target.value })}>{['مالية', 'غذائية', 'طبية', 'تعليمية', 'أخرى'].map((k) => <option key={k}>{k}</option>)}</select></label>
      <label>الكنيسة<select value={hpForm.church_id} onChange={(e) => setHpForm({ ...hpForm, church_id: e.target.value })}><option value="">بدون</option>{churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>رقم التواصل<input dir="ltr" value={hpForm.contact_phone} onChange={(e) => setHpForm({ ...hpForm, contact_phone: e.target.value })} /></label>
      <label>الحالة<select value={hpForm.status} onChange={(e) => setHpForm({ ...hpForm, status: e.target.value as Help['status'] })}>{(Object.keys(statusLabel) as Help['status'][]).map((k) => <option key={k} value={k}>{statusLabel[k]}</option>)}</select></label>
      <label className="wide">التفاصيل<textarea rows={3} value={hpForm.details} onChange={(e) => setHpForm({ ...hpForm, details: e.target.value })} /></label>
      <div className="admin-checks"><label><input type="checkbox" checked={hpForm.is_published} onChange={(e) => setHpForm({ ...hpForm, is_published: e.target.checked })} /> إعلان للجميع</label></div>
      <div className="admin-form-actions"><button className="btn primary" disabled={busy}><Check size={15} /> حفظ</button><button type="button" className="btn outline" onClick={() => setOpen(false)}>إلغاء</button></div></form></div>}
  </>;
}
