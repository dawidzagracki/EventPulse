import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EventsListPage } from './features/events/EventsListPage'
import { EventDetailPage } from './features/events/EventDetailPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
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
