import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '../stores/authStore'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export function createEventConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${baseURL}/hubs/event`, {
      accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
    })
    .withAutomaticReconnect()
    .build()
}

export function createQuizConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${baseURL}/hubs/quiz`, {
      accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
    })
    .withAutomaticReconnect()
    .build()
}
