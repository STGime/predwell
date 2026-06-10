import { createClient } from '@eurobase/sdk'

export const eb = createClient({
  url: import.meta.env.VITE_EUROBASE_URL,
  apiKey: import.meta.env.VITE_EUROBASE_PUBLIC_KEY,
  // Required for realtime subscriptions with an end-user JWT.
  projectId: import.meta.env.VITE_EUROBASE_PROJECT_ID,
})
