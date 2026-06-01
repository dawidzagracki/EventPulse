import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EventsListPage } from './features/events/EventsListPage'
import { EventDetailPage } from './features/events/EventDetailPage'
import { ParticipantTokenPage } from './features/participant/ParticipantTokenPage'
import { ParticipantHome } from './features/participant/ParticipantHome'
import { ScannerPage } from './features/scanner/ScannerPage'
import { PublicEventPage } from './features/public/PublicEventPage'

const adminGuard = (element: React.ReactNode) => (
  <ProtectedRoute allow={['Agency', 'Client']}>{element}</ProtectedRoute>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/p/:token', element: <ParticipantTokenPage /> },
  { path: '/public/events/:eventId', element: <PublicEventPage /> },
  {
    path: '/me',
    element: (
      <ProtectedRoute allow={['Participant']}>
        <ParticipantHome />
      </ProtectedRoute>
    ),
  },
  { path: '/events/:eventId/scanner', element: adminGuard(<ScannerPage />) },
  { path: '/events/:eventId', element: adminGuard(<EventDetailPage />) },
  { path: '/events', element: adminGuard(<EventsListPage />) },
  { path: '/', element: <Navigate to="/events" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
