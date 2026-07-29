import { AxiosError } from 'axios'

/**
 * RFC7807 body the API returns for every handled failure (see AppExceptionHandler on the backend):
 * the message lands in `title`, validation details in `errors`.
 */
export interface ProblemDetails {
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
}

/** The ProblemDetails body of a failed request, or null if the call failed some other way. */
export function problemOf(error: unknown): ProblemDetails | null {
  if (error instanceof AxiosError && error.response?.data && typeof error.response.data === 'object') {
    return error.response.data as ProblemDetails
  }
  return null
}

/** HTTP status of a failed request; undefined when the request never got a response (offline, DNS…). */
export function statusOf(error: unknown): number | undefined {
  return error instanceof AxiosError ? error.response?.status : undefined
}

/**
 * Something to show the user, always non-empty — silence is the worst outcome, because the
 * organiser then cannot tell whether their action worked.
 *
 * `known` maps HTTP statuses we have our own (translated) copy for; anything else falls back to
 * the server's message, then to `fallback`. Validation problems are flattened into one line.
 */
export function apiErrorMessage(
  error: unknown,
  fallback: string,
  known?: Record<number, string>,
): string {
  const status = statusOf(error)
  if (status !== undefined && known?.[status]) {
    return known[status]
  }

  const problem = problemOf(error)
  const validation = problem?.errors && Object.values(problem.errors).flat().filter(Boolean)
  if (validation && validation.length > 0) {
    return validation.join(' ')
  }

  return problem?.title?.trim() || problem?.detail?.trim() || fallback
}
