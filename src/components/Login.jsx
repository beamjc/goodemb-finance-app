import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-xs tracking-widest uppercase text-inkSoft">Good Embroidery</div>
          <h1 className="font-serif font-bold text-2xl text-navy mt-1">สมุดบัญชีโรงปัก</h1>
        </div>
        <form onSubmit={handleSubmit} className="stitch-box bg-paperCard p-6 space-y-4">
          <div>
            <label className="block text-xs text-inkSoft mb-1">อีเมล</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-md px-3 py-2 bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-navySoft"
            />
          </div>
          <div>
            <label className="block text-xs text-inkSoft mb-1">รหัสผ่าน</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line rounded-md px-3 py-2 bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-navySoft"
            />
          </div>
          {error && <div className="text-rust text-sm font-medium">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy hover:bg-navySoft text-paperCard font-semibold rounded-md py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <p className="text-center text-xs text-inkSoft mt-4">
          บัญชีถูกสร้างไว้ล่วงหน้าโดยผู้ดูแลระบบเท่านั้น ไม่มีการเปิดสมัครสมาชิกเอง
        </p>
      </div>
    </div>
  )
}
