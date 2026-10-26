import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Church, Coordinates, Restaurant } from '../types';

const churchIcon = L.divIcon({ className: 'cf-leaflet-icon', html: '<span class="map-pin church-pin"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="transform:rotate(45deg)" aria-hidden="true"><path d="M12 3v18M6 9h12"/></svg></span>', iconSize: [32, 36], iconAnchor: [16, 31] });
const activeChurchIcon = L.divIcon({ className: 'cf-leaflet-icon', html: '<span class="map-pin active-pin"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="transform:rotate(45deg)" aria-hidden="true"><path d="M12 3v18M6 9h12"/></svg></span>', iconSize: [38, 42], iconAnchor: [19, 37] });
const userIcon = L.divIcon({ className: 'cf-leaflet-icon', html: '<span class="user-dot"><i></i></span>', iconSize: [30, 30], iconAnchor: [15, 15] });
const foodIcon = L.divIcon({ className: 'cf-leaflet-icon', html: '<span class="map-pin food-pin"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)" aria-hidden="true"><path d="M4 11l8-7 8 7M6 10v10h12V10"/></svg></span>', iconSize: [32, 36], iconAnchor: [16, 31] });
function Recenter({ center }: { center: Coordinates }) { const map = useMap(); useEffect(() => { map.setView([center.lat, center.lng]); }, [map, center.lat, center.lng]); return null; }
type Place = Church | Restaurant;
function isChurch(p: Place): p is Church { return 'denomination' in p; }
export default function MapView({ places, center, selectedId, onSelect, userLocation, route, zoom = 13, className = '' }: {
  places: Place[]; center: Coordinates; selectedId?: string; onSelect?: (place: Place) => void;
  userLocation?: Coordinates | null; route?: [number, number][] | null; zoom?: number; className?: string;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  return <div className={`map-canvas ${className}`}>
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom className="leaflet-map" zoomControl={false}>
      <Recenter center={center} />
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setTilesFailed(true), tileload: () => setTilesFailed(false) }} />
      {places.map((place) => <Marker key={place.id} position={[place.coordinates.lat, place.coordinates.lng]} title={place.name} alt={place.name} icon={selectedId === place.id ? activeChurchIcon : (isChurch(place) ? churchIcon : foodIcon)} eventHandlers={{ click: () => onSelect?.(place) }}>
        <Popup><strong>{place.name}</strong><br />{place.address}<br /></Popup>
      </Marker>)}
      {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}><Popup>موقعك الحالي</Popup></Marker>}
      {route && route.length > 1 && <RouteLine positions={route} />}
    </MapContainer>
    {tilesFailed && <div className="map-load-warning">تعذر تحميل الخريطة، تأكد من الإنترنت.</div>}
    <span className="map-attribution">© OpenStreetMap</span>
  </div>;
}
import { Polyline } from 'react-leaflet';
function RouteLine({ positions }: { positions: [number, number][] }) { return <Polyline positions={positions} pathOptions={{ color: '#1265d8', weight: 5, opacity: 0.88 }} />; }
