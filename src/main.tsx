import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initSentry, setUserContext } from './lib/sentry'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from './stores/authStore'

// Initialize Sentry for error tracking
initSentry()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

// Set up Sentry user context when auth state changes
const { subscribe } = useAuthStore
let currentUser: { id: string; email?: string } | null = null

subscribe((state) => {
  const newUser = state.user ? { id: state.user.id, email: state.user.email } : null
  if (newUser?.id !== currentUser?.id) {
    currentUser = newUser
    setUserContext(currentUser)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
