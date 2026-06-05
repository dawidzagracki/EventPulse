import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  contestRanking,
  quizRanking,
  useAddQuestion,
  useContests,
  useCreateContest,
  useCreateQuiz,
  useQuizzes,
} from './api'
import { Button, Card, Field, Input } from '../../components/ui'
import { Icon, type IconName } from '../../components/Icon'
import type { ContestDto, QuizDto, RankingEntry } from '../../types/api'

type View =
  | { kind: 'empty' }
  | { kind: 'new-contest' }
  | { kind: 'new-quiz' }
  | { kind: 'contest'; contest: ContestDto }
  | { kind: 'quiz'; quiz: QuizDto }

type Mode = 'contests' | 'quizzes'

export function EngagementTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: contests } = useContests(eventId)
  const { data: quizzes } = useQuizzes(eventId)
  const [mode, setMode] = useState<Mode>('contests')
  const [view, setView] = useState<View>({ kind: 'empty' })

  function changeMode(m: Mode) {
    setMode(m)
    setView({ kind: 'empty' })
  }

  const items = mode === 'contests' ? contests ?? [] : quizzes ?? []

  return (
    <div className="space-y-4">
      {/* TOP TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-slate-800/80 bg-slate-950/40 p-1">
          <TabButton active={mode === 'contests'} onClick={() => changeMode('contests')} icon="bolt">
            {t('engagement.contests')}
            <span className="ml-1 rounded-full bg-slate-800/80 px-1.5 text-[10px] text-slate-400">
              {contests?.length ?? 0}
            </span>
          </TabButton>
          <TabButton active={mode === 'quizzes'} onClick={() => changeMode('quizzes')} icon="sparkles">
            {t('engagement.quizzes')}
            <span className="ml-1 rounded-full bg-slate-800/80 px-1.5 text-[10px] text-slate-400">
              {quizzes?.length ?? 0}
            </span>
          </TabButton>
        </div>

        <Button
          className="ml-auto"
          onClick={() => setView({ kind: mode === 'contests' ? 'new-contest' : 'new-quiz' })}
        >
          <Icon name="plus" className="h-4 w-4" />
          {mode === 'contests' ? t('engagement.newContest') : t('engagement.newQuiz')}
        </Button>
      </div>

      {/* No items, no form → single full-width empty state. */}
      {items.length === 0 && view.kind === 'empty' ? (
        <EmptyAll mode={mode} onNew={() => setView({ kind: mode === 'contests' ? 'new-contest' : 'new-quiz' })} />
      ) : items.length === 0 ? (
        // No items but a form is open → render the form full-width, skip the list column.
        <div className="mx-auto w-full max-w-3xl">
          {view.kind === 'new-contest' && (
            <NewContestForm
              eventId={eventId}
              onDone={(c) => setView({ kind: 'contest', contest: c })}
              onCancel={() => setView({ kind: 'empty' })}
            />
          )}
          {view.kind === 'new-quiz' && (
            <NewQuizForm
              eventId={eventId}
              onDone={(q) => setView({ kind: 'quiz', quiz: q })}
              onCancel={() => setView({ kind: 'empty' })}
            />
          )}
        </div>
      ) : (
      <div className="grid items-start gap-4 lg:grid-cols-[340px_1fr]">
        {/* LEFT: list */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <EmptyList mode={mode} onNew={() => setView({ kind: mode === 'contests' ? 'new-contest' : 'new-quiz' })} />
          ) : (
            <>
              {mode === 'contests'
                ? (contests ?? []).map((c) => (
                    <ListItem
                      key={c.id}
                      active={view.kind === 'contest' && view.contest.id === c.id}
                      icon="bolt"
                      title={c.name}
                      subtitle={c.mode === 0 ? t('engagement.points') : t('engagement.time')}
                      onClick={() => setView({ kind: 'contest', contest: c })}
                    />
                  ))
                : (quizzes ?? []).map((q) => (
                    <ListItem
                      key={q.id}
                      active={view.kind === 'quiz' && view.quiz.id === q.id}
                      icon="sparkles"
                      title={q.title}
                      subtitle={t('engagement.quizzes')}
                      onClick={() => setView({ kind: 'quiz', quiz: q })}
                    />
                  ))}
              <button
                onClick={() => setView({ kind: mode === 'contests' ? 'new-contest' : 'new-quiz' })}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-700/60 px-3 py-2.5 text-sm text-slate-400 transition hover:border-indigo-400/60 hover:bg-indigo-500/5 hover:text-white"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                {mode === 'contests' ? t('engagement.newContest') : t('engagement.newQuiz')}
              </button>
            </>
          )}
        </div>

        {/* RIGHT: detail */}
        <div>
          {view.kind === 'empty' && <EmptyDetail mode={mode} />}
          {view.kind === 'new-contest' && (
            <NewContestForm eventId={eventId} onDone={(c) => setView({ kind: 'contest', contest: c })} onCancel={() => setView({ kind: 'empty' })} />
          )}
          {view.kind === 'new-quiz' && (
            <NewQuizForm eventId={eventId} onDone={(q) => setView({ kind: 'quiz', quiz: q })} onCancel={() => setView({ kind: 'empty' })} />
          )}
          {view.kind === 'contest' && <ContestDetail key={view.contest.id} eventId={eventId} contest={view.contest} />}
          {view.kind === 'quiz' && <QuizDetail key={view.quiz.id} eventId={eventId} quiz={view.quiz} />}
        </div>
      </div>
      )}
    </div>
  )
}

// ============ Combined empty (no items yet, no form open) ============
function EmptyAll({ mode, onNew }: { mode: Mode; onNew: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-[-4rem] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="relative flex flex-col items-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
          <Icon name={mode === 'contests' ? 'bolt' : 'sparkles'} className="h-7 w-7 text-indigo-200" />
        </div>
        <p className="mt-4 text-base font-semibold text-white">
          {mode === 'contests' ? t('engagement.noContests') : t('engagement.noQuizzes')}
        </p>
        <p className="mt-1 max-w-md text-sm text-slate-400">
          {mode === 'contests' ? t('engagement.noContestsHint') : t('engagement.noQuizzesHint')}
        </p>
        <Button className="mt-5" onClick={onNew}>
          <Icon name="plus" className="h-4 w-4" />
          {mode === 'contests' ? t('engagement.newContest') : t('engagement.newQuiz')}
        </Button>
      </div>
    </Card>
  )
}

// ============ Top tab ============
function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: IconName
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-white ring-1 ring-inset ring-indigo-400/40'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
      }`}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}

// ============ List item ============
function ListItem({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean
  icon: IconName
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
        active
          ? 'border-indigo-400/40 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 ring-1 ring-inset ring-indigo-400/40'
          : 'border-slate-800/70 bg-slate-900/40 hover:border-indigo-400/30 hover:bg-slate-900'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active ? 'bg-indigo-500/30 ring-1 ring-inset ring-indigo-400/40' : 'bg-slate-950/60 ring-1 ring-inset ring-slate-700/60'
        } text-indigo-200`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="truncate text-[11px] text-slate-400">{subtitle}</p>
      </div>
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500 transition group-hover:text-indigo-300" fill="currentColor" aria-hidden>
        <path d="M9 6l6 6-6 6V6z" />
      </svg>
    </button>
  )
}

// ============ Empty list (no contests/quizzes yet) ============
function EmptyList({ mode, onNew }: { mode: Mode; onNew: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col items-center py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
        <Icon name={mode === 'contests' ? 'bolt' : 'sparkles'} className="h-5 w-5 text-indigo-200" />
      </div>
      <p className="mt-3 text-sm font-semibold text-white">
        {mode === 'contests' ? t('engagement.noContests') : t('engagement.noQuizzes')}
      </p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">
        {mode === 'contests' ? t('engagement.noContestsHint') : t('engagement.noQuizzesHint')}
      </p>
      <Button className="mt-4" onClick={onNew}>
        <Icon name="plus" className="h-3.5 w-3.5" />
        {mode === 'contests' ? t('engagement.newContest') : t('engagement.newQuiz')}
      </Button>
    </Card>
  )
}

// ============ Empty detail (nothing selected) ============
function EmptyDetail({ mode }: { mode: Mode }) {
  const { t } = useTranslation()
  return (
    <Card className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-inset ring-indigo-400/30">
        <Icon name={mode === 'contests' ? 'bolt' : 'sparkles'} className="h-6 w-6 text-indigo-200" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{t('engagement.selectQuiz')}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">
        {mode === 'contests' ? t('engagement.noContestsHint') : t('engagement.noQuizzesHint')}
      </p>
    </Card>
  )
}

// ============ New contest form ============
function NewContestForm({
  eventId,
  onDone,
  onCancel,
}: {
  eventId: string
  onDone: (c: ContestDto) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateContest(eventId)
  const [name, setName] = useState('')
  const [mode, setMode] = useState(0)

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
          <Icon name="bolt" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-white">{t('engagement.newContest')}</h3>
          <p className="text-xs text-slate-400">{t('engagement.noContestsHint')}</p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const c = await create.mutateAsync({ name, mode })
          onDone(c)
        }}
        className="space-y-4"
      >
        <Field label={t('engagement.name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Konkurs główny 2026" />
        </Field>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            {t('engagement.contestMode')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ModeOption
              selected={mode === 0}
              onClick={() => setMode(0)}
              icon="bolt"
              title={t('engagement.points')}
              desc={t('engagement.modePoints')}
            />
            <ModeOption
              selected={mode === 1}
              onClick={() => setMode(1)}
              icon="clock"
              title={t('engagement.time')}
              desc={t('engagement.modeTime')}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={create.isPending}>
            <Icon name="check" className="h-3.5 w-3.5" />
            {t('common.create')}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function ModeOption({
  selected,
  onClick,
  icon,
  title,
  desc,
}: {
  selected: boolean
  onClick: () => void
  icon: IconName
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
        selected
          ? 'border-indigo-400/40 bg-indigo-500/10 ring-1 ring-inset ring-indigo-400/40'
          : 'border-slate-800/70 bg-slate-900/40 hover:border-indigo-400/30'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          selected ? 'bg-indigo-500/30 text-indigo-100' : 'bg-slate-950/60 text-slate-300'
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{desc}</p>
      </div>
    </button>
  )
}

// ============ New quiz form ============
function NewQuizForm({
  eventId,
  onDone,
  onCancel,
}: {
  eventId: string
  onDone: (q: QuizDto) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateQuiz(eventId)
  const [title, setTitle] = useState('')

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
          <Icon name="sparkles" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-white">{t('engagement.newQuiz')}</h3>
          <p className="text-xs text-slate-400">{t('engagement.noQuizzesHint')}</p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const q = await create.mutateAsync({ title })
          onDone(q)
        }}
        className="space-y-4"
      >
        <Field label={t('engagement.quizTitle')}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Quiz wiedzy o firmie" />
        </Field>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={create.isPending}>
            <Icon name="check" className="h-3.5 w-3.5" />
            {t('common.create')}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ============ Contest detail ============
function ContestDetail({ eventId, contest }: { eventId: string; contest: ContestDto }) {
  const { t } = useTranslation()
  const { data: ranking, isLoading } = useQuery({
    queryKey: ['contest-ranking', eventId, contest.id],
    queryFn: () => contestRanking(eventId, contest.id),
  })

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
            <Icon name="bolt" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-white">{contest.name}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {contest.mode === 0 ? t('engagement.modePoints') : t('engagement.modeTime')}
            </p>
          </div>
        </div>
      </Card>

      <RankingPanel rows={ranking ?? []} loading={isLoading} />
    </div>
  )
}

// ============ Quiz detail ============
interface QuizQuestion {
  id?: string
  text: string
  options: string[]
  correctIndex: number
}

function QuizDetail({ eventId, quiz }: { eventId: string; quiz: QuizDto }) {
  const { t } = useTranslation()
  const addQuestion = useAddQuestion(eventId)
  const [tab, setTab] = useState<'questions' | 'ranking'>('questions')
  // Local list of just-added questions for instant feedback. Backend has no
  // GET /questions endpoint so this keeps the editor session-friendly.
  const [recentQuestions, setRecentQuestions] = useState<QuizQuestion[]>([])

  // Fetch ranking only when the Ranking tab is active.
  const { data: ranking, isLoading } = useQuery({
    queryKey: ['quiz-ranking', eventId, quiz.id],
    queryFn: () => quizRanking(eventId, quiz.id),
    enabled: tab === 'ranking',
  })

  async function handleSaveQuestion(q: QuizQuestion) {
    await addQuestion.mutateAsync({
      quizId: quiz.id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
    })
    setRecentQuestions((prev) => [...prev, q])
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/30">
            <Icon name="sparkles" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-white">{quiz.title}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {recentQuestions.length} {t('engagement.questions')}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-1 rounded-lg border border-slate-800/70 bg-slate-950/40 p-1">
          <button
            onClick={() => setTab('questions')}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition ${
              tab === 'questions' ? 'bg-indigo-500/30 text-white ring-1 ring-inset ring-indigo-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('engagement.currentQuestions')}
          </button>
          <button
            onClick={() => setTab('ranking')}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition ${
              tab === 'ranking' ? 'bg-indigo-500/30 text-white ring-1 ring-inset ring-indigo-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('engagement.ranking')}
          </button>
        </div>
      </Card>

      {tab === 'questions' && (
        <>
          {recentQuestions.length > 0 && (
            <Card>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                {t('engagement.currentQuestions')} · {recentQuestions.length}
              </h4>
              <ul className="space-y-2">
                {recentQuestions.map((q, i) => (
                  <li key={i} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-sm font-medium text-white">
                      {i + 1}. {q.text}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {q.options.map((opt, j) => (
                        <li
                          key={j}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                            j === q.correctIndex ? 'bg-emerald-400/10 text-emerald-300' : 'text-slate-400'
                          }`}
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold">
                            {String.fromCharCode(65 + j)}
                          </span>
                          {opt}
                          {j === q.correctIndex && <Icon name="check" className="h-3 w-3 text-emerald-400" />}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <AddQuestionForm onSave={handleSaveQuestion} isSaving={addQuestion.isPending} />
        </>
      )}

      {tab === 'ranking' && <RankingPanel rows={ranking ?? []} loading={isLoading} />}
    </div>
  )
}

// ============ Add-question form (intuitive!) ============
function AddQuestionForm({
  onSave,
  isSaving,
}: {
  onSave: (q: QuizQuestion) => Promise<void>
  isSaving: boolean
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [correctIndex, setCorrectIndex] = useState(0)

  function reset() {
    setText('')
    setOptions(['', ''])
    setCorrectIndex(0)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = options.map((o) => o.trim()).filter(Boolean)
    if (cleaned.length < 2) return
    await onSave({
      text: text.trim(),
      options: cleaned,
      correctIndex: Math.min(correctIndex, cleaned.length - 1),
    })
    reset()
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950/60 ring-1 ring-inset ring-indigo-400/30 text-indigo-200">
          <Icon name="plus" className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-semibold text-white">{t('engagement.addQuestion')}</h3>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label={t('engagement.questionText')}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={2}
            placeholder={t('engagement.questionPlaceholder')}
            className="w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              {t('engagement.correctAnswer')}
            </p>
            <p className="text-[10px] text-slate-500">{t('engagement.minOptionsHint')}</p>
          </div>
          <ul className="space-y-2">
            {options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i)
              const isCorrect = correctIndex === i
              return (
                <li key={i}>
                  <div
                    className={`flex items-center gap-2 rounded-lg border p-2 transition ${
                      isCorrect ? 'border-emerald-400/40 bg-emerald-500/5' : 'border-slate-800/70 bg-slate-900/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(i)}
                      title={t('engagement.markCorrect')}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold transition ${
                        isCorrect
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isCorrect ? <Icon name="check" className="h-3.5 w-3.5" /> : letter}
                    </button>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options]
                        next[i] = e.target.value
                        setOptions(next)
                      }}
                      placeholder={t('engagement.answerOption', { n: letter })}
                      className="flex-1 rounded-md border border-slate-700/60 bg-slate-950/60 px-2.5 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = options.filter((_, j) => j !== i)
                          setOptions(next)
                          if (correctIndex >= next.length) setCorrectIndex(next.length - 1)
                          else if (correctIndex === i) setCorrectIndex(0)
                        }}
                        title={t('engagement.removeOption')}
                        className="rounded p-1.5 text-rose-400 hover:bg-rose-500/20"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={() => setOptions([...options, ''])}
            disabled={options.length >= 8}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-700/60 px-3 py-1.5 text-xs text-slate-400 transition hover:border-indigo-400/60 hover:bg-indigo-500/5 hover:text-white disabled:opacity-40"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            {t('engagement.addOption')}
          </button>
        </div>

        <div className="flex gap-2 border-t border-slate-800/80 pt-3">
          <Button type="submit" disabled={isSaving || options.filter((o) => o.trim()).length < 2}>
            <Icon name="check" className="h-3.5 w-3.5" />
            {t('engagement.saveQuestion')}
          </Button>
          <Button type="button" variant="ghost" onClick={reset} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ============ Ranking panel ============
function RankingPanel({ rows, loading }: { rows: RankingEntry[]; loading: boolean }) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg border border-slate-800/70 bg-slate-900/40" />
        ))}
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <Card className="flex flex-col items-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/10 ring-1 ring-inset ring-amber-400/30">
          <Icon name="sparkles" className="h-5 w-5 text-amber-200" />
        </div>
        <p className="mt-3 text-sm font-semibold text-white">{t('engagement.noRankingYet')}</p>
        <p className="mt-1 max-w-xs text-xs text-slate-400">{t('engagement.noRankingYetHint')}</p>
      </Card>
    )
  }
  const top3 = ['🥇', '🥈', '🥉']
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">{t('engagement.ranking')}</h3>
      <ol className="space-y-1.5">
        {rows.map((r) => (
          <li
            key={r.rank}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
              r.rank <= 3 ? 'bg-gradient-to-r from-amber-500/10 to-transparent' : 'bg-slate-800/30'
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center text-sm">
              {r.rank <= 3 ? top3[r.rank - 1] : <span className="text-xs font-bold text-slate-400">#{r.rank}</span>}
            </span>
            <span className="flex-1 truncate text-sm text-white">{r.name}</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-amber-300">{r.score}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}
