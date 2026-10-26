import type { ReactNode } from 'react';
import { Heart, MapPin, Star, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Church, Restaurant } from '../types';
import { useApp } from '../context/AppContext';
import { distanceKm, formatDistance } from '../utils/geo';

const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#efe7d8"/><path d="M120 70v100M84 104h72" stroke="#a9844a" stroke-width="8" stroke-linecap="round"/></svg>');
export const imgFallback = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK; };
export function OpenPill({ open }: { open?: boolean }) {
  if (open === undefined) return null;
  return <span className={`pill ${open ? 'open' : 'closed'}`}><i />{open ? 'مفتوحة الآن' : 'مغلقة'}</span>;
}
export function Rating({ value }: { value?: number }) { return value ? <span className="rating"><Star size={12} fill="currentColor" />{value.toFixed(1)}</span> : null; }

export function ChurchCard({ church }: { church: Church }) {
  const { favorites, toggleFavorite, location } = useApp();
  const fav = favorites.includes(church.id);
  return <article className="row-card">
    <Link to={`/church/${church.id}`} className="row-photo"><img src={church.image} alt="" loading="lazy" onError={imgFallback} /></Link>
    <div className="row-body">
      <div className="row-top"><Link to={`/church/${church.id}`} className="row-title">{church.name}</Link><button className={`heart ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(church.id)} aria-label="المفضلة"><Heart size={17} fill={fav ? 'currentColor' : 'none'} /></button></div>
      <p className="row-sub"><MapPin size={12} />{church.neighborhood} - {church.governorate}</p>
      <div className="row-meta"><OpenPill open={church.sampleOpen} />{location && <span className="dist">{formatDistance(distanceKm(location, church.coordinates))}</span>}<Rating value={church.rating} /></div>
    </div>
  </article>;
}
export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const { favorites, toggleFavorite, location } = useApp();
  const fav = favorites.includes(restaurant.id);
  return <article className="row-card">
    <Link to={`/route/${restaurant.id}`} className="row-photo"><img src={restaurant.image} alt="" loading="lazy" onError={imgFallback} /></Link>
    <div className="row-body">
      <div className="row-top"><Link to={`/route/${restaurant.id}`} className="row-title">{restaurant.name}</Link><button className={`heart ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(restaurant.id)} aria-label="المفضلة"><Heart size={17} fill={fav ? 'currentColor' : 'none'} /></button></div>
      <p className="row-sub">{restaurant.category} - {restaurant.address}</p>
      <div className="row-meta">{restaurant.priceLabel && <span className="pill neutral"><Clock3 size={11} />{restaurant.priceLabel}</span>}{location && <span className="dist">{formatDistance(distanceKm(location, restaurant.coordinates))}</span>}<Rating value={restaurant.rating ?? restaurant.sampleRating} /></div>
    </div>
  </article>;
}
export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return <div className="page-title"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{action}</div>;
}
export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return <div className="empty"><div className="empty-mark">✝</div><h3>{title}</h3>{body && <p>{body}</p>}{action}</div>;
}
