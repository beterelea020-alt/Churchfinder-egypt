import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { Bell, Heart, Home, Map as MapIcon, MoreHorizontal, Utensils, Cross } from 'lucide-react';
import { useApp } from '../context/AppContext';

const tabs = [
  { to: '/explore', label: 'الرئيسية', icon: Home },
  { to: '/map', label: 'الخريطة', icon: MapIcon },
  { to: '/restaurants', label: 'المطاعم', icon: Utensils },
  { to: '/favorites', label: 'المفضلة', icon: Heart },
  { to: '/more', label: 'المزيد', icon: MoreHorizontal },
];
export function Avatar({ size = 36 }: { size?: number }) {
  const { profile, userName } = useApp();
  return profile?.avatar_url
    ? <img className="avatar-img" style={{ width: size, height: size }} src={profile.avatar_url} alt="" />
    : <span className="avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.42 }}>{(userName || 'ز').slice(0, 1).toUpperCase()}</span>;
}
export default function AppLayout() {
  const { dataStatus, dataMessage, feedbackMessage, clearFeedback } = useApp();
  const { pathname } = useLocation();
  const wide = pathname.startsWith('/admin');
  const bare = pathname.startsWith('/church/') || pathname.startsWith('/route/');
  return <div className={`shell ${wide ? 'wide' : ''}`}>
    {!bare && <header className="top-bar">
      <Link to="/profile" aria-label="حسابي"><Avatar /></Link>
      <Link to="/explore" className="top-title">ChurchFinder</Link>
      <Link to="/events" className="icon-round" aria-label="الاجتماعات"><Bell size={18} /></Link>
    </header>}
    <main className={`page ${bare ? 'bare' : ''}`}>
      {dataStatus !== 'live' && <div className="banner">{dataMessage}</div>}
      {feedbackMessage && <button className="banner ok" onClick={clearFeedback}>{feedbackMessage}</button>}
      <Outlet />
    </main>
    {!wide && <nav className="tab-bar" aria-label="التنقل">{tabs.map((t) => <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}><t.icon size={20} strokeWidth={1.8} /><span>{t.label}</span></NavLink>)}</nav>}
    {wide && <Link to="/explore" className="admin-back"><Cross size={14} /> الرجوع للتطبيق</Link>}
  </div>;
}
