import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login.jsx'
import MainApp from './components/MainApp.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-inkSoft">กำลังโหลด...</div>
  }

  if (!session) {
    return <Login />
  }

  return <MainApp session={session} />
}
