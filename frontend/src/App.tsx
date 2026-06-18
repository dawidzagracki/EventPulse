import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EventsListPage } from './features/events/EventsListPage'
import { EventDetailPage } from './features/events/EventDetailPage'
import { ParticipantTokenPage } from './features/participant/ParticipantTokenPage'
import { ParticipantHome } from './features/participant/ParticipantHome'
import { ScannerPage } from './features/scanner/ScannerPage'
import { PublicEventPage } from './features/public/PublicEventPage'
import { OperatorLandingPage } from './features/operator/OperatorLandingPage'
import { TeamPage } from './features/team/TeamPage'

const adminGuard = (element: React.ReactNode) => (
  <ProtectedRoute allow={['Agency', 'Client']}>{element}</ProtectedRoute>
)

const agencyGuard = (element: React.ReactNode) => (
  <ProtectedRoute allow={['Agency']}>{element}</ProtectedRoute>
)

const scannerGuard = (element: React.ReactNode) => (
  <ProtectedRoute allow={['Agency', 'Client', 'Operator']}>{element}</ProtectedRoute>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/p/:token', element: <ParticipantTokenPage /> },
  { path: '/op/:token', element: <OperatorLandingPage /> },
  { path: '/public/events/:eventId', element: <PublicEventPage /> },
  { path: '/public/:slug', element: <PublicEventPage /> },
  {
    path: '/me',
    element: (
      <ProtectedRoute allow={['Participant']}>
        <ParticipantHome />
      </ProtectedRoute>
    ),
  },
  { path: '/team', element: agencyGuard(<TeamPage />) },
  { path: '/events/:eventId/scanner', element: scannerGuard(<ScannerPage />) },
  { path: '/events/:eventId', element: adminGuard(<EventDetailPage />) },
  { path: '/events', element: adminGuard(<EventsListPage />) },
  { path: '/', element: <Navigate to="/events" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
