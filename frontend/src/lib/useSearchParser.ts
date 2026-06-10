import { useEffect, useRef, useState } from 'react'
import { eb } from './eurobase'
import type { ParsedSearch } from './data'

interface State {
  parsing: boolean
  result: ParsedSearch | null
  /** True when the parser is unavailable (no key/error) — caller falls back to manual controls. */
  unavailable: boolean
}

/**
 * Debounced free-text → structured criteria via the parse-search edge function.
 * Calls ~`delay` ms after the user stops typing. Degrades silently: on any
 * error the manual controls remain authoritative (`unavailable` flips true).
 */
export function useSearchParser(text: string, onParsed: (p: ParsedSearch) => void, delay = 800): State {
  const [state, setState] = useState<State>({ parsing: false, result: null, unavailable: false })
  const onParsedRef = useRef(onParsed)
  onParsedRef.current = onParsed
  const lastText = useRef('')

  useEffect(() => {
    const trimmed = text.trim()
    if (trimmed.length < 6 || trimmed === lastText.current) return
    const handle = setTimeout(async () => {
      lastText.current = trimmed
      setState((s) => ({ ...s, parsing: true }))
      const { data, error } = await eb.functions.invoke<ParsedSearch>('parse-search', {
        body: { text: trimmed },
      })
      if (error || !data) {
        setState({ parsing: false, result: null, unavailable: true })
        return
      }
      setState({ parsing: false, result: data, unavailable: false })
      onParsedRef.current(data)
    }, delay)
    return () => clearTimeout(handle)
  }, [text, delay])

  return state
}
