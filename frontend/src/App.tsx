import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EventsListPage } from './features/events/EventsListPage'
import { EventDetailPage } from './features/events/EventDetailPage'
import { ParticipantTokenPage } from './features/participant/ParticipantTokenPage'
import { ParticipantHome } from './features/participant/ParticipantHome'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/p/:token', element: <ParticipantTokenPage /> },
  {
    path: '/me',
    element: (
      <ProtectedRoute allow={['Participant']}>
        <ParticipantHome />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute allow={['Agency', 'Client']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/events" replace /> },
      { path: 'events', element: <EventsListPage /> },
      { path: 'events/:eventId', element: <EventDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
