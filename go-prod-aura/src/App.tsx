import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { LandingPage } from './pages/public/LandingPage'
import { ToastProvider } from './components/aura/ToastProvider'
import { useEventStore } from './store/useEventStore'
import { useEffect } from 'react'

// Dashboard
import DashboardPage from './pages/app/dashboard'

// Artistes
import ArtistesPage from './pages/app/artistes'
import ArtistDetailPage from './pages/app/artistes/detail'
import ArtistStatsPage from './pages/app/artistes/stats'
import LineupTimelinePage from './pages/LineupTimelinePage'

// Administration

// Settings
import { SettingsLayout } from './pages/settings/SettingsLayout'
import { SettingsGeneralPage } from './pages/settings/SettingsGeneralPage'
import { SettingsArtistsPage } from './pages/settings/SettingsArtistsPage'
import { SettingsBookingPage } from './pages/settings/SettingsBookingPage'
import { SettingsAdminPage } from './pages/settings/SettingsAdminPage'
import { SettingsProductionPage } from './pages/settings/SettingsProductionPage'
import { SettingsPressePage } from './pages/settings/SettingsPressePage'
import { SettingsContactsPage } from './pages/settings/SettingsContactsPage'
import { SettingsPermissionsPage } from './pages/settings/SettingsPermissionsPage'

// Production
import ProductionPage from './pages/app/production'
import TouringPartyPage from './pages/app/production/touring-party'
import TimetablePage from './pages/app/production/timetable'
import TechniquePage from './pages/app/production/technique'
import TravelPage from './pages/app/production/travel'
import PartyCrewPage from './pages/app/production/partycrew'

// Production > Ground
import GroundPage from './pages/app/production/ground'
import MissionsPage from './pages/app/production/ground/missions'
import ChauffeursPage from './pages/app/production/ground/chauffeurs'
import VehiculesPage from './pages/app/production/ground/vehicules'
import HorairesPage from './pages/app/production/ground/horaires'

// Production > Hospitality
import HospitalityPage from './pages/app/production/hospitality'
import BackstagePage from './pages/app/production/hospitality/backstage'
import CateringPage from './pages/app/production/hospitality/catering'
import HotelsPage from './pages/app/production/hospitality/hotels'

// Administration
import AdministrationPage from './pages/app/administration'
import AdminBookingPage from './pages/app/administration/booking'
import BudgetArtistiquePage from './pages/app/administration/budget-artistique'
import ContratsPage from './pages/app/administration/contrats'
import FinancesPage from './pages/app/administration/finances'
import VentesPage from './pages/app/administration/ventes'

// Booking
// import BookingPage from './pages/BookingPage' // Fichier n'existe plus

// Settings
import SettingsIndexPage from './pages/app/settings'
import ProfilePage from './pages/settings/ProfilePage'
import SecurityPage from './pages/settings/SecurityPage'
import PermissionsSettingsPage from './pages/app/settings/permissions'

// Presse
import PressePage from './pages/app/presse'

// Contacts
import ContactsPage from './pages/app/contacts'
import PersonnesPage from './pages/app/contacts/personnes'
import EntreprisesPage from './pages/app/contacts/entreprises'

// Staff
import StaffPage from './pages/app/staff'
import StaffPlanningPage from './pages/app/staff/planning'
import StaffCampaignsPage from './pages/app/staff/campaigns'
import StaffCommunicationsPage from './pages/app/staff/communications'
import StaffExportsPage from './pages/app/staff/exports'
import SettingsStaffPage from './pages/settings/SettingsStaffPage'

// Admin (legacy)
import PermissionsPage from './pages/admin/PermissionsPage'

export default function App(){
  // Initialiser le store d'évènements au démarrage
  const hydrateFromLocalStorage = useEventStore(state => state.hydrateFromLocalStorage);
  
  useEffect(() => {
    hydrateFromLocalStorage();
  }, [hydrateFromLocalStorage]);

  return (
    <ToastProvider>
      <Routes>
      {/* Redirect root to app */}
      <Route path="/" element={<Navigate to="/app" replace />} />

      {/* Public Routes (landing page) */}
      <Route path="/landing" element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
      </Route>

      {/* Timeline - FULL WIDTH (sans sidebar) */}
      <Route path="/app/booking/timeline" element={<LineupTimelinePage/>}/>
      {/* Ancienne route maintenue pour compatibilité */}
      <Route path="/app/lineup/timeline" element={<Navigate to="/app/booking/timeline" replace />}/>

      {/* App Routes */}
      <Route path="/app" element={<AppLayout/>}>
        {/* Dashboard */}
        <Route index element={<DashboardPage/>}/>
        
        {/* Artistes */}
        <Route path="artistes">
          <Route index element={<ArtistesPage/>}/>
          <Route path="detail/:id" element={<ArtistDetailPage/>}/>
          <Route path="stats" element={<ArtistStatsPage/>}/>
        </Route>

        {/* Production */}
        <Route path="production">
          <Route index element={<ProductionPage/>}/>
          <Route path="touring-party" element={<TouringPartyPage/>}/>
          <Route path="timetable" element={<TimetablePage/>}/>
          <Route path="technique" element={<TechniquePage/>}/>
          <Route path="travel" element={<TravelPage/>}/>
          <Route path="partycrew" element={<PartyCrewPage/>}/>
          
          {/* Production > Ground */}
          <Route path="ground">
            <Route index element={<GroundPage/>}/>
            <Route path="missions" element={<MissionsPage/>}/>
            <Route path="chauffeurs" element={<ChauffeursPage/>}/>
            <Route path="vehicules" element={<VehiculesPage/>}/>
            <Route path="horaires" element={<HorairesPage/>}/>
          </Route>

          {/* Production > Hospitality */}
          <Route path="hospitality">
            <Route index element={<HospitalityPage/>}/>
            <Route path="backstage" element={<BackstagePage/>}/>
            <Route path="catering" element={<CateringPage/>}/>
            <Route path="hotels" element={<HotelsPage/>}/>
          </Route>
        </Route>

        {/* Booking */}
        <Route path="booking">
          <Route path="offres" element={<AdminBookingPage/>}/>
          <Route path="budget-artistique" element={<BudgetArtistiquePage/>}/>
        </Route>

        {/* Administration */}
        <Route path="administration">
          <Route index element={<AdministrationPage/>}/>
          {/* Redirections pour compatibilité */}
          <Route path="booking" element={<Navigate to="/app/booking/offres" replace />}/>
          <Route path="budget-artistique" element={<Navigate to="/app/booking/budget-artistique" replace />}/>
          <Route path="contrats" element={<ContratsPage/>}/>
          <Route path="finances" element={<FinancesPage/>}/>
          <Route path="ventes" element={<VentesPage/>}/>
        </Route>

        {/* Settings */}
        <Route path="settings" element={<SettingsLayout/>}>
          <Route index element={<Navigate to="/app/settings/general" replace />}/>
          <Route path="general" element={<SettingsGeneralPage/>}/>
          <Route path="artists" element={<SettingsArtistsPage/>}/>
          <Route path="booking" element={<SettingsBookingPage/>}/>
          <Route path="admin" element={<SettingsAdminPage/>}/>
          <Route path="production" element={<SettingsProductionPage/>}/>
          <Route path="presse" element={<SettingsPressePage/>}/>
          <Route path="contacts" element={<SettingsContactsPage/>}/>
          <Route path="staff" element={<SettingsStaffPage/>}/>
          <Route path="permissions" element={<SettingsPermissionsPage/>}/>
        </Route>


        {/* Presse */}
        <Route path="presse" element={<PressePage/>}/>

        {/* Contacts */}
        <Route path="contacts">
          <Route index element={<ContactsPage/>}/>
          <Route path="personnes" element={<PersonnesPage/>}/>
          <Route path="entreprises" element={<EntreprisesPage/>}/>
        </Route>

        {/* Staff */}
        <Route path="staff">
          <Route index element={<StaffPage/>}/>
          <Route path="planning" element={<StaffPlanningPage/>}/>
          <Route path="campaigns" element={<StaffCampaignsPage/>}/>
          <Route path="communications" element={<StaffCommunicationsPage/>}/>
          <Route path="exports" element={<StaffExportsPage/>}/>
        </Route>

        {/* Settings */}
        <Route path="settings">
          <Route index element={<SettingsIndexPage/>}/>
          <Route path="profile" element={<ProfilePage/>}/>
          <Route path="security" element={<SecurityPage/>}/>
          <Route path="permissions" element={<PermissionsSettingsPage/>}/>
        </Route>

        {/* Admin (legacy) */}
        <Route path="admin">
          <Route path="permissions" element={<PermissionsPage/>}/>
        </Route>
      </Route>

      {/* Auth Routes (placeholders) */}
      <Route path="/auth">
        <Route path="signin" element={<div className="min-h-screen bg-night-900 flex items-center justify-center text-white"><div className="text-center"><h1 className="text-3xl font-bold mb-4">Connexion</h1><p className="text-gray-400">Page de connexion à implémenter</p></div></div>} />
        <Route path="signup" element={<div className="min-h-screen bg-night-900 flex items-center justify-center text-white"><div className="text-center"><h1 className="text-3xl font-bold mb-4">Inscription</h1><p className="text-gray-400">Page d'inscription à implémenter</p></div></div>} />
      </Route>
    </Routes>
    </ToastProvider>
  )
}
