import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/AppLayout';
import AdminPage from './pages/AdminPage';
import {
  AuthPage, ChurchDetailsPage, ChurchesPage, EventsPage, ExplorePage, FavoritesPage, FiltersPage, HelpPage,
  LocationPage, MapSearchPage, MorePage, ProfilePage, RestaurantsPage, RoutePage, WelcomePage,
} from './pages/Pages';

export default function App() {
  return <AppProvider><BrowserRouter><Routes>
    <Route path="/" element={<Navigate to="/welcome" replace />} />
    <Route path="/welcome" element={<WelcomePage />} />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/location" element={<LocationPage />} />
    <Route element={<AppLayout />}>
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/map" element={<MapSearchPage />} />
      <Route path="/churches" element={<ChurchesPage />} />
      <Route path="/church/:id" element={<ChurchDetailsPage />} />
      <Route path="/route/:id" element={<RoutePage />} />
      <Route path="/filters" element={<FiltersPage />} />
      <Route path="/restaurants" element={<RestaurantsPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/more" element={<MorePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/explore" replace />} />
    </Route>
  </Routes></BrowserRouter></AppProvider>;
}
