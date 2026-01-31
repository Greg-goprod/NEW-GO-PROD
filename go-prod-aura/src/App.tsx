import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { ToastProvider } from './components/aura/ToastProvider'
import { useEventStore } from './store/useEventStore'

// Auth - chargé immédiatement car critique
import { AuthProvider } from './contexts/AuthContext'
import { RequireAuth } from './components/auth/RequireAuth'

// Layout - chargé immédiatement
import AppLayout from './layout/AppLayout'

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto"></div>
        <p className="mt-3 text-gray-400 text-sm">Chargement...</p>
      </div>
    </div>
  )
}

// ============================================================================
// LAZY LOADED PAGES - Se chargent à la demande
// ============================================================================

// Auth
const SignInPage = lazy(() => import('./pages/auth/SignInPage'))

// Public
const PublicLayout = lazy(() => import('./layouts/PublicLayout').then(m => ({ default: m.PublicLayout })))
const LandingPage = lazy(() => import('./pages/public/LandingPage').then(m => ({ default: m.LandingPage })))

// Select Event (page de sélection d'événement)
const SelectEventPage = lazy(() => import('./pages/app/SelectEventPage'))

// Dashboard
const DashboardPage = lazy(() => import('./pages/app/dashboard'))

// Artistes
const ArtistesPage = lazy(() => import('./pages/app/artistes'))
const ArtistDetailPage = lazy(() => import('./pages/app/artistes/detail'))
const ArtistStatsPage = lazy(() => import('./pages/app/artistes/stats'))
const LineupTimelinePage = lazy(() => import('./pages/LineupTimelinePage'))

// Settings Layout
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout').then(m => ({ default: m.SettingsLayout })))
const SettingsGeneralPage = lazy(() => import('./pages/settings/SettingsGeneralPage').then(m => ({ default: m.SettingsGeneralPage })))
const SettingsArtistsPage = lazy(() => import('./pages/settings/SettingsArtistsPage').then(m => ({ default: m.SettingsArtistsPage })))
const SettingsBookingPage = lazy(() => import('./pages/settings/SettingsBookingPage').then(m => ({ default: m.SettingsBookingPage })))
const SettingsAdminPage = lazy(() => import('./pages/settings/SettingsAdminPage').then(m => ({ default: m.SettingsAdminPage })))
const SettingsProductionPage = lazy(() => import('./pages/settings/SettingsProductionPage').then(m => ({ default: m.SettingsProductionPage })))
const SettingsPressePage = lazy(() => import('./pages/settings/SettingsPressePage').then(m => ({ default: m.SettingsPressePage })))
const SettingsContactsPage = lazy(() => import('./pages/settings/SettingsContactsPage').then(m => ({ default: m.SettingsContactsPage })))
const SettingsPermissionsPage = lazy(() => import('./pages/settings/SettingsPermissionsPage').then(m => ({ default: m.SettingsPermissionsPage })))
const SettingsStaffPage = lazy(() => import('./pages/settings/SettingsStaffPage'))
const SettingsEventsPage = lazy(() => import('./pages/settings/SettingsEventsPage').then(m => ({ default: m.SettingsEventsPage })))

// Production
const ProductionPage = lazy(() => import('./pages/app/production'))
const TouringPartyPage = lazy(() => import('./pages/app/production/touring-party'))
const TimetablePage = lazy(() => import('./pages/app/production/timetable'))
const TechniquePage = lazy(() => import('./pages/app/production/technique'))
const TravelPage = lazy(() => import('./pages/app/production/travel'))
const PartyCrewPage = lazy(() => import('./pages/app/production/partycrew'))

// Production > Ground
const GroundPage = lazy(() => import('./pages/app/production/ground'))
const MissionsPage = lazy(() => import('./pages/app/production/ground/missions'))
const ChauffeursPage = lazy(() => import('./pages/app/production/ground/chauffeurs'))
const VehiculesPage = lazy(() => import('./pages/app/production/ground/vehicules'))
const HorairesPage = lazy(() => import('./pages/app/production/ground/horaires'))

// Production > Hospitality
const HospitalityPage = lazy(() => import('./pages/app/production/hospitality'))
const BackstagePage = lazy(() => import('./pages/app/production/hospitality/backstage'))
const CateringPage = lazy(() => import('./pages/app/production/hospitality/catering'))
const HotelsPage = lazy(() => import('./pages/app/production/hospitality/hotels'))

// Administration
const AdministrationPage = lazy(() => import('./pages/app/administration'))
const AdminBookingPage = lazy(() => import('./pages/app/administration/booking'))
const BudgetArtistiquePage = lazy(() => import('./pages/app/administration/budget-artistique'))
const ContratsPage = lazy(() => import('./pages/app/administration/contrats'))
const FinancesPage = lazy(() => import('./pages/app/administration/finances'))
const VentesPage = lazy(() => import('./pages/app/administration/ventes'))

// Settings (app)
const SettingsIndexPage = lazy(() => import('./pages/app/settings'))
const ProfilePage = lazy(() => import('./pages/settings/ProfilePage'))
const SecurityPage = lazy(() => import('./pages/settings/SecurityPage'))
const PermissionsSettingsPage = lazy(() => import('./pages/app/settings/permissions'))

// Presse
const PressePage = lazy(() => import('./pages/app/presse'))

// Contacts
const ContactsPage = lazy(() => import('./pages/app/contacts'))
const PersonnesPage = lazy(() => import('./pages/app/contacts/personnes'))
const EntreprisesPage = lazy(() => import('./pages/app/contacts/entreprises'))

// Staff
const StaffPage = lazy(() => import('./pages/app/staff'))
const StaffPlanningPage = lazy(() => import('./pages/app/staff/planning'))
const StaffCampaignsPage = lazy(() => import('./pages/app/staff/campaigns'))
const StaffCommunicationsPage = lazy(() => import('./pages/app/staff/communications'))
const StaffExportsPage = lazy(() => import('./pages/app/staff/exports'))

// Admin (legacy)
const PermissionsPage = lazy(() => import('./pages/admin/PermissionsPage'))

// ============================================================================
// APP COMPONENT
// ============================================================================

export default function App() {
  const hydrateFromLocalStorage = useEventStore(state => state.hydrateFromLocalStorage);
  
  useEffect(() => {
    hydrateFromLocalStorage();
  }, [hydrateFromLocalStorage]);

  return (
    <AuthProvider>
    <ToastProvider>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Redirect root to select-event */}
        <Route path="/" element={<Navigate to="/app/select-event" replace />} />

        {/* Auth Routes */}
        <Route path="/auth/signin" element={<SignInPage />} />

        {/* Public Routes (landing page) */}
        <Route path="/landing" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
        </Route>

        {/* Select Event - Page de sélection d'événement (sans sidebar) */}
        <Route path="/app/select-event" element={<RequireAuth><SelectEventPage/></RequireAuth>}/>

        {/* Timeline - FULL WIDTH (sans sidebar) - Protected */}
        <Route path="/app/booking/timeline" element={<RequireAuth><LineupTimelinePage/></RequireAuth>}/>
        <Route path="/app/lineup/timeline" element={<Navigate to="/app/booking/timeline" replace />}/>

        {/* App Routes - All Protected */}
        <Route path="/app" element={<RequireAuth><AppLayout/></RequireAuth>}>
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
            <Route path="events" element={<SettingsEventsPage/>}/>
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

          {/* Settings (legacy routes) */}
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
      </Routes>
      </Suspense>
    </ToastProvider>
    </AuthProvider>
  )
}
