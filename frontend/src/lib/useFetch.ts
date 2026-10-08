import { useCallback, useEffect, useState, type DependencyList } from 'react'
import { isAbortError } from '../api/client'

interface FetchState<T> {
  data: T | undefined
  loading: boolean
  error: string | null
}

/**
 * Loads data whenever `deps` change; stale requests are aborted.
 * Keeps the previous data while reloading so lists don't flicker.
 */
export function useFetch<T>(load: (signal: AbortSignal) => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<FetchState<T>>({ data: undefined, loading: true, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((current) => ({ ...current, loading: true, error: null }))

    load(controller.signal).then(
      (data) => setState({ data, loading: false, error: null }),
      (error: unknown) => {
        if (isAbortError(error)) return
        setState((current) => ({ ...current, loading: false, error: errorMessage(error) }))
      },
    )
    return () => controller.abort()
    // `load` is recreated on every render; `deps` describe what it depends on.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}
