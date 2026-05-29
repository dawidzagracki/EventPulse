import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { ContactDto, ContestDto, QuizDto, QuizTakeDto, RankingEntry } from '../../types/api'

// ---- Agency ----

export function useContests(eventId: string) {
  return useQuery({
    queryKey: ['contests', eventId],
    queryFn: async () => (await api.get<ContestDto[]>(`/api/events/${eventId}/contests`)).data,
  })
}

export function useCreateContest(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; mode: number }) =>
      (await api.post<ContestDto>(`/api/events/${eventId}/contests`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contests', eventId] }),
  })
}

export async function contestRanking(eventId: string, contestId: string) {
  return (await api.get<RankingEntry[]>(`/api/events/${eventId}/contests/${contestId}/ranking`)).data
}

export function useQuizzes(eventId: string) {
  return useQuery({
    queryKey: ['quizzes', eventId],
    queryFn: async () => (await api.get<QuizDto[]>(`/api/events/${eventId}/quizzes`)).data,
  })
}

export function useCreateQuiz(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { title: string }) =>
      (await api.post<QuizDto>(`/api/events/${eventId}/quizzes`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes', eventId] }),
  })
}

export function useAddQuestion(eventId: string) {
  return useMutation({
    mutationFn: async (vars: { quizId: string; text: string; options: string[]; correctIndex: number }) => {
      await api.post(`/api/events/${eventId}/quizzes/${vars.quizId}/questions`, {
        text: vars.text,
        options: vars.options,
        correctIndex: vars.correctIndex,
      })
    },
  })
}

export async function quizRanking(eventId: string, quizId: string) {
  return (await api.get<RankingEntry[]>(`/api/events/${eventId}/quizzes/${quizId}/ranking`)).data
}

// ---- Participant ----

export function useMyQuizzes() {
  return useQuery({
    queryKey: ['me', 'quizzes'],
    queryFn: async () => (await api.get<QuizDto[]>('/api/me/quizzes')).data,
  })
}

export async function getQuizTake(quizId: string) {
  return (await api.get<QuizTakeDto>(`/api/me/quizzes/${quizId}`)).data
}

export async function submitQuiz(quizId: string, answers: Record<string, number>) {
  return (await api.post<{ score: number }>(`/api/me/quizzes/${quizId}/submit`, answers)).data
}

export function useMyContacts() {
  return useQuery({
    queryKey: ['me', 'contacts'],
    queryFn: async () => (await api.get<ContactDto[]>('/api/me/networking')).data,
  })
}

export function useAddContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (targetToken: string) =>
      (await api.post<ContactDto>('/api/me/networking', { targetToken })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'contacts'] }),
  })
}
