import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const CATS = {
  fixed: { label: 'Fixed cost', color: '#B6442A' },
  goods: { label: 'ค่าของ (ไหม, วีราเน่)', color: '#C97B45' },
  shipping: { label: 'ค่าขนส่ง (lalamove)', color: '#D9A441' },
  credit_dad: { label: 'บัตรเครดิต (ของป๊า)', color: '#2C3550' },
  credit_beam: { label: 'บัตรเครดิต (ของบีม)', color: '#4A5578' },
  labor_child: { label: 'ค่าแรงงานเด็ก', color: '#8A5A83' },
  house: { label: 'ค่าบ้าน', color: '#7A5C3E' },
  water: { label: 'ค่าน้ำ', color: '#3E7CA6' },
  electric: { label: 'ค่าไฟ', color: '#B8860B' },
  other: { label: 'อื่นๆ', color: '#6B6357' },
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function pad(n) { return String(n).padStart(2, '0') }
function monthKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }
function monthRange(d) {
  const start = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const end = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`
  return { start, end }
}
function fmtMoney(n) {
  n = Number(n) || 0
  return '฿' + n.toLocaleString('th-TH', { maximumFractionDigits: 2 })
}
function fmtDateThai(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d)) return dateStr
  const beYear = d.getFullYear() + 543
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()].slice(0, 3)} ${String(beYear).slice(-2)}`
}
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function MainApp({ session }) {
  const userId = session.user.id
  const [view, setView] = useState('dashboard')
  const [currentMonth, setCurrentMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState([])
  const [pendingAll, setPendingAll] = useState([])
  const [transferredThisMonth, setTransferredThisMonth] = useState([])
  const [target, setTarget] = useState(null)
  const [targetInput, setTargetInput] = useState('')
  const [loading, setLoading] = useState(true)

  const [expForm, setExpForm] = useState({ id: null, category: 'fixed', date: todayISO(), amount: '', note: '' })
  const [incForm, setIncForm] = useState({ id: null, billDate: todayISO(), billNumber: '', company: '', amount: '', status: 'pending', transferredDate: '' })
  const [companyFilter, setCompanyFilter] = useState('')

  const mk = monthKey(currentMonth)
  const { start, end } = useMemo(() => monthRange(currentMonth), [currentMonth])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: exp }, { data: inc }, { data: tgt }, { data: pend }, { data: trf }] = await Promise.all([
      supabase.from('expenses').select('*').gte('date', start).lt('date', end).order('date', { ascending: false }),
      supabase.from('income').select('*').gte('bill_date', start).lt('bill_date', end).order('bill_date', { ascending: false }),
      supabase.from('targets').select('*').eq('month_key', mk).maybeSingle(),
      supabase.from('income').select('*').eq('status', 'pending').order('bill_date', { ascending: true }),
      supabase.from('income').select('*').eq('status', 'transferred').gte('transferred_date', start).lt('transferred_date', end).order('transferred_date', { ascending: false }),
    ])
    setExpenses(exp || [])
    setIncome(inc || [])
    setPendingAll(pend || [])
    setTransferredThisMonth(trf || [])
    setTarget(tgt ? Number(tgt.amount) : null)
    setTargetInput(tgt ? String(tgt.amount) : '')
    setLoading(false)
  }, [start, end, mk])

  useEffect(() => { fetchAll() }, [fetchAll])

  function changeMonth(delta) {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + delta)
    setCurrentMonth(d)
  }

  // ---- expense handlers ----
  function resetExpForm() {
    setExpForm({ id: null, category: 'fixed', date: todayISO(), amount: '', note: '' })
  }
  async function saveExpense() {
    const amount = parseFloat(expForm.amount)
    if (!expForm.date || isNaN(amount) || amount <= 0) {
      alert('กรุณากรอกวันที่และจำนวนเงินให้ถูกต้อง')
      return
    }
    if (expForm.id) {
      await supabase.from('expenses').update({
        category: expForm.category, date: expForm.date, amount, note: expForm.note.trim(),
      }).eq('id', expForm.id)
    } else {
      await supabase.from('expenses').insert({
        user_id: userId, category: expForm.category, date: expForm.date, amount, note: expForm.note.trim(),
      })
    }
    resetExpForm()
    fetchAll()
  }
  function editExpense(e) {
    setExpForm({ id: e.id, category: e.category, date: e.date, amount: String(e.amount), note: e.note || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function deleteExpense(id) {
    if (!confirm('ลบรายการนี้หรือไม่?')) return
    await supabase.from('expenses').delete().eq('id', id)
    fetchAll()
  }

  // ---- income handlers ----
  function resetIncForm() {
    setIncForm({ id: null, billDate: todayISO(), billNumber: '', company: '', amount: '', status: 'pending', transferredDate: '' })
  }
  async function saveIncome() {
    const amount = parseFloat(incForm.amount)
    if (!incForm.billDate || !incForm.company.trim() || isNaN(amount) || amount <= 0) {
      alert('กรุณากรอกวันวางบิล ชื่อบริษัท และจำนวนเงินให้ถูกต้อง')
      return
    }
    const transferredDate = incForm.status === 'transferred' ? (incForm.transferredDate || todayISO()) : null
    if (incForm.id) {
      await supabase.from('income').update({
        bill_date: incForm.billDate, bill_number: incForm.billNumber.trim() || null, company: incForm.company.trim(), amount, status: incForm.status, transferred_date: transferredDate,
      }).eq('id', incForm.id)
    } else {
      await supabase.from('income').insert({
        user_id: userId, bill_date: incForm.billDate, bill_number: incForm.billNumber.trim() || null, company: incForm.company.trim(), amount, status: incForm.status, transferred_date: transferredDate,
      })
    }
    resetIncForm()
    fetchAll()
  }
  function editIncome(i) {
    setIncForm({ id: i.id, billDate: i.bill_date, billNumber: i.bill_number || '', company: i.company, amount: String(i.amount), status: i.status, transferredDate: i.transferred_date || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function deleteIncome(id) {
    if (!confirm('ลบรายการนี้หรือไม่?')) return
    await supabase.from('income').delete().eq('id', id)
    fetchAll()
  }
  async function toggleIncomeStatus(i) {
    const newStatus = i.status === 'transferred' ? 'pending' : 'transferred'
    const transferredDate = newStatus === 'transferred' ? todayISO() : null
    await supabase.from('income').update({ status: newStatus, transferred_date: transferredDate }).eq('id', i.id)
    fetchAll()
  }

  // ---- target ----
  async function saveTarget() {
    const val = parseFloat(targetInput)
    if (!isNaN(val) && val > 0) {
      await supabase.from('targets').upsert({ user_id: userId, month_key: mk, amount: val }, { onConflict: 'user_id,month_key' })
    } else {
      await supabase.from('targets').delete().eq('user_id', userId).eq('month_key', mk)
    }
    fetchAll()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  // ---- CSV export ----
  function downloadCsv(filename, rows) {
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  function exportExpenseCsv() {
    const rows = [['วันที่', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน']]
    expenses.forEach(e => rows.push([e.date, CATS[e.category]?.label || e.category, e.note || '', e.amount]))
    downloadCsv(`รายจ่าย_${mk}.csv`, rows)
  }
  function exportIncomeCsv() {
    const rows = [['วันวางบิล', 'เลขที่บิล', 'บริษัท', 'ยอดวางบิล', 'สถานะ']]
    filteredIncome.forEach(i => rows.push([i.bill_date, i.bill_number || '', i.company, i.amount, i.status === 'transferred' ? 'โอนแล้ว' : 'ยังไม่โอน']))
    downloadCsv(`รายรับ_${mk}.csv`, rows)
  }

  // ---- derived totals ----
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalReal = transferredThisMonth.reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalPending = income.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalPendingAll = pendingAll.reduce((s, i) => s + Number(i.amount || 0), 0)
  const profit = totalReal - totalExpense
  const filteredIncome = useMemo(() => {
    const q = companyFilter.trim().toLowerCase()
    return q ? income.filter(i => i.company.toLowerCase().includes(q)) : income
  }, [income, companyFilter])
  const totalFilteredIncome = filteredIncome.reduce((s, i) => s + Number(i.amount || 0), 0)

  const byCat = {}
  Object.keys(CATS).forEach(c => byCat[c] = 0)
  expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0) })
  const maxCat = Math.max(1, ...Object.values(byCat))

  const beYear = currentMonth.getFullYear() + 543
  const today = new Date(); today.setHours(0, 0, 0, 0)

  return (
    <div className="min-h-screen pb-16 px-4 pt-6">
      <div className="max-w-4xl mx-auto">

        <header className="text-center mb-2 relative">
          <button onClick={handleLogout} className="absolute right-0 top-0 text-xs text-inkSoft border border-line rounded-md px-3 py-1.5 hover:bg-paperDark">
            ออกจากระบบ
          </button>
          <div className="text-xs tracking-widest uppercase text-inkSoft">Good Embroidery</div>
          <h1 className="font-serif font-bold text-2xl text-navy mt-1">สมุดบัญชีโรงปัก</h1>
          <div className="text-xs text-inkSoft">บันทึกรายรับ–รายจ่าย เช็คยอดที่ต้องทำให้ครบเป้าในแต่ละเดือน</div>
        </header>

        <div className="flex items-center justify-center gap-4 my-4">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full bg-navy text-paperCard text-sm hover:bg-navySoft">‹</button>
          <div className="font-serif font-semibold text-lg text-navy min-w-[180px] text-center">
            {THAI_MONTHS[currentMonth.getMonth()]} {beYear}
          </div>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full bg-navy text-paperCard text-sm hover:bg-navySoft">›</button>
        </div>

        <div className="flex justify-center gap-2 mb-5 flex-wrap">
          {[['dashboard', 'แดชบอร์ด'], ['expense', 'รายจ่าย'], ['income', 'รายรับ']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`text-sm font-semibold px-4 py-2 rounded-full border-2 border-navy transition-colors ${view === key ? 'bg-navy text-paperCard' : 'text-navy hover:bg-paperDark'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-inkSoft py-10">กำลังโหลดข้อมูล...</div>
        ) : (
          <>
            {view === 'dashboard' && (
              <section>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <div className="stitch-box bg-paperCard p-4" style={{ borderColor: '#B6442A' }}>
                    <div className="text-xs text-inkSoft mb-1">รายจ่ายเดือนนี้</div>
                    <div className="font-serif font-bold text-xl" style={{ color: '#B6442A' }}>{fmtMoney(totalExpense)}</div>
                  </div>
                  <div className="stitch-box bg-paperCard p-4" style={{ borderColor: '#4F7942' }}>
                    <div className="text-xs text-inkSoft mb-1">รายได้ที่โอนแล้ว (เงินเข้าจริงเดือนนี้)</div>
                    <div className="font-serif font-bold text-xl" style={{ color: '#4F7942' }}>{fmtMoney(totalReal)}</div>
                  </div>
                  <div className="stitch-box bg-paperCard p-4" style={{ borderColor: '#B8860B' }}>
                    <div className="text-xs text-inkSoft mb-1">รายได้ที่ยังไม่โอน (บิลเดือนนี้)</div>
                    <div className="font-serif font-bold text-xl" style={{ color: '#B8860B' }}>{fmtMoney(totalPending)}</div>
                  </div>
                </div>

                <div className="stitch-box bg-paperCard p-5 mb-4" style={{ borderColor: '#B8860B' }}>
                  <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                    <h3 className="font-serif text-navy m-0">บิลค้างโอนสะสม (ทุกเดือน)</h3>
                    <div className="text-sm text-inkSoft">
                      รวม <b className="text-ink">{fmtMoney(totalPendingAll)}</b> ({pendingAll.length} รายการ)
                    </div>
                  </div>
                  {pendingAll.length === 0 ? (
                    <div className="text-center text-inkSoft text-sm py-4">ไม่มีบิลค้างโอน</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase text-inkSoft border-b-2 border-dashed border-line">
                            <th className="py-1.5 px-2">วันวางบิล</th><th className="px-2">เลขที่บิล</th><th className="px-2">บริษัท</th><th className="px-2 text-right">ยอด</th><th className="px-2">ค้างมา</th><th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingAll.map(i => {
                            const bd = new Date(i.bill_date + 'T00:00:00')
                            const days = Math.floor((today - bd) / 86400000)
                            return (
                              <tr key={i.id} className="border-b border-paperDark hover:bg-paperDark">
                                <td className="py-2.5 px-2">{fmtDateThai(i.bill_date)}</td>
                                <td className="px-2">{i.bill_number || '-'}</td>
                                <td className="px-2">{i.company}</td>
                                <td className="px-2 text-right font-semibold">{fmtMoney(i.amount)}</td>
                                <td className="px-2">{days > 0 && <span className="text-rust text-xs">{days} วัน</span>}</td>
                                <td className="px-2">
                                  <button onClick={() => toggleIncomeStatus(i)} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gold/20 text-gold hover:bg-gold/30">
                                    ทำเครื่องหมายว่าโอนแล้ว
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="stitch-box bg-paperCard p-5 mb-4">
                  <div className="text-xs text-inkSoft mb-1">กำไรสุทธิเดือนนี้ (รายได้ที่โอนแล้ว − รายจ่าย)</div>
                  <div className={`font-serif font-bold text-2xl ${profit >= 0 ? 'text-sage' : 'text-rust'}`}>
                    {profit < 0 ? '-' : ''}{fmtMoney(Math.abs(profit))}
                  </div>
                </div>

                <div className="stitch-box bg-paperCard p-5 mb-4">
                  <h3 className="font-serif text-navy mb-3">เป้าหมายรายได้เดือนนี้</h3>
                  <div className="flex gap-2 flex-wrap mb-2">
                    <input
                      type="number" min="0" step="100" placeholder="ใส่เป้าหมาย เช่น 150000"
                      value={targetInput} onChange={e => setTargetInput(e.target.value)}
                      className="border border-line rounded-md px-3 py-1.5 text-sm bg-paper w-44"
                    />
                    <button onClick={saveTarget} className="bg-navy text-paperCard text-sm font-semibold px-4 py-1.5 rounded-md hover:bg-navySoft">บันทึกเป้าหมาย</button>
                  </div>
                  {target && target > 0 ? (
                    <>
                      <div className="w-full h-3.5 bg-paperDark rounded-full overflow-hidden">
                        <div className="h-full bg-sage" style={{ width: `${Math.min(100, (totalReal / target) * 100)}%` }} />
                      </div>
                      <div className={`text-sm font-semibold mt-2 ${target - totalReal <= 0 ? 'text-sage' : 'text-rust'}`}>
                        {target - totalReal <= 0
                          ? `ถึงเป้าแล้ว เกินเป้า ${fmtMoney(Math.abs(target - totalReal))}`
                          : `ต้องทำยอด (โอนเข้าจริง) เพิ่มอีก ${fmtMoney(target - totalReal)} เพื่อให้ถึงเป้า ${fmtMoney(target)}`}
                      </div>
                      <div className="text-xs text-inkSoft mt-1">
                        รวมยอดที่ยังไม่โอนตอนนี้: {fmtMoney(totalPending)}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-inkSoft">ยังไม่ได้ตั้งเป้าหมายของเดือนนี้</div>
                  )}
                </div>

                <div className="stitch-box bg-paperCard p-5">
                  <h3 className="font-serif text-navy mb-3">สัดส่วนรายจ่ายตามหมวด</h3>
                  {expenses.length === 0 ? (
                    <div className="text-center text-inkSoft text-sm py-4">ยังไม่มีรายจ่ายในเดือนนี้</div>
                  ) : (
                    Object.keys(CATS).map(c => (
                      <div key={c} className="flex items-center gap-2.5 mb-2.5 text-sm">
                        <span className="cat-dot" style={{ background: CATS[c].color }} />
                        <span className="w-40 flex-shrink-0">{CATS[c].label}</span>
                        <span className="flex-1 h-2.5 bg-paperDark rounded-full overflow-hidden">
                          <span className="block h-full rounded-full" style={{ width: `${(byCat[c] / maxCat) * 100}%`, background: CATS[c].color }} />
                        </span>
                        <span className="w-24 text-right font-semibold flex-shrink-0">{fmtMoney(byCat[c])}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {view === 'expense' && (
              <section>
                <div className="stitch-box bg-paperCard p-5 mb-4">
                  <h3 className="font-serif text-navy mb-3">{expForm.id ? 'แก้ไขรายจ่าย' : 'เพิ่มรายจ่าย'}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-inkSoft mb-1">หมวดหมู่</label>
                      <select value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper">
                        {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-inkSoft mb-1">วันที่</label>
                      <input type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper" />
                    </div>
                    <div>
                      <label className="block text-xs text-inkSoft mb-1">จำนวนเงิน (บาท)</label>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper" />
                    </div>
                    <div>
                      <label className="block text-xs text-inkSoft mb-1">รายละเอียด</label>
                      <input type="text" placeholder="เช่น ค่าด้ายปัก" value={expForm.note} onChange={e => setExpForm({ ...expForm, note: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveExpense} className="bg-navy text-paperCard text-sm font-semibold px-5 py-2 rounded-md hover:bg-navySoft">
                      {expForm.id ? 'บันทึกการแก้ไข' : 'บันทึกรายจ่าย'}
                    </button>
                    {expForm.id && <button onClick={resetExpForm} className="border border-line text-inkSoft text-sm px-4 py-2 rounded-md">ยกเลิกการแก้ไข</button>}
                  </div>
                </div>

                <div className="stitch-box bg-paperCard p-5">
                  <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                    <h3 className="font-serif text-navy m-0">รายการรายจ่ายเดือนนี้</h3>
                    <button onClick={exportExpenseCsv} className="border border-line text-inkSoft text-xs px-3 py-1.5 rounded-md hover:bg-paperDark">ส่งออก CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-inkSoft border-b-2 border-dashed border-line">
                          <th className="py-1.5 px-2">วันที่</th><th className="px-2">หมวดหมู่</th><th className="px-2">รายละเอียด</th><th className="px-2 text-right">จำนวนเงิน</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map(e => (
                          <tr key={e.id} className="border-b border-paperDark hover:bg-paperDark">
                            <td className="py-2.5 px-2">{fmtDateThai(e.date)}</td>
                            <td className="px-2"><span className="cat-dot mr-1.5" style={{ background: CATS[e.category]?.color || '#999' }} />{CATS[e.category]?.label || e.category}</td>
                            <td className="px-2">{e.note || '-'}</td>
                            <td className="px-2 text-right font-semibold">{fmtMoney(e.amount)}</td>
                            <td className="px-2">
                              <div className="flex gap-1">
                                <button onClick={() => editExpense(e)} className="text-xs text-inkSoft hover:text-navy hover:bg-paperDark px-2 py-1 rounded">แก้ไข</button>
                                <button onClick={() => deleteExpense(e.id)} className="text-xs text-inkSoft hover:text-rust hover:bg-paperDark px-2 py-1 rounded">ลบ</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {expenses.length === 0 && <div className="text-center text-inkSoft text-sm py-6">ยังไม่มีรายจ่ายในเดือนนี้</div>}
                  <div className="text-right text-sm text-inkSoft mt-3">รวมรายจ่ายเดือนนี้: <b className="text-ink text-base">{fmtMoney(totalExpense)}</b></div>
                </div>
              </section>
            )}

            {view === 'income' && (
              <section>
                <div className="stitch-box bg-paperCard p-5 mb-4">
                  <h3 className="font-serif text-navy mb-3">{incForm.id ? 'แก้ไขรายรับ' : 'เพิ่มรายรับ (วางบิล)'}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-inkSoft mb-1">วันวางบิล</label>
                      <input type="date" value={incForm.billDate} onChange={e => setIncForm({ ...incForm, billDate: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper" />
                    </div>
                    <div>
                      <label className="block text-xs text-inkSoft mb-1">เลขที่บิล</label>
                      <input type="text" placeholder="เช่น INV-0001" value={incForm.billNumber} onChange={e => setIncForm({ ...incForm, billNumber: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper" />
                    </div>
                    <div>
                      <label className="block text-xs text-inkSoft mb-1">ชื่อบริษัท</label>
                      <input type="text" placeholder="ชื่อลูกค้า/บริษัท" value={incForm.company} onChange={e => setIncForm({ ...incForm, company: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper" />
                    </div>
                    <div>
                      <label className="block text-xs text-inkSoft mb-1">ยอดที่วางบิล (บาท)</label>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={incForm.amount} onChange={e => setIncForm({ ...incForm, amount: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper" />
                    </div>
                    <div>
                      <label className="block text-xs text-inkSoft mb-1">สถานะ</label>
                      <select value={incForm.status} onChange={e => setIncForm({ ...incForm, status: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper">
                        <option value="pending">ยังไม่โอน</option>
                        <option value="transferred">โอนแล้ว</option>
                      </select>
                    </div>
                    {incForm.status === 'transferred' && (
                      <div>
                        <label className="block text-xs text-inkSoft mb-1">วันที่โอนเงินเข้าจริง</label>
                        <input type="date" value={incForm.transferredDate || todayISO()} onChange={e => setIncForm({ ...incForm, transferredDate: e.target.value })} className="w-full border border-line rounded-md px-2 py-2 text-sm bg-paper" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveIncome} className="bg-navy text-paperCard text-sm font-semibold px-5 py-2 rounded-md hover:bg-navySoft">
                      {incForm.id ? 'บันทึกการแก้ไข' : 'บันทึกรายรับ'}
                    </button>
                    {incForm.id && <button onClick={resetIncForm} className="border border-line text-inkSoft text-sm px-4 py-2 rounded-md">ยกเลิกการแก้ไข</button>}
                  </div>
                </div>

                <div className="stitch-box bg-paperCard p-5">
                  <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                    <h3 className="font-serif text-navy m-0">รายการวางบิลเดือนนี้</h3>
                    <button onClick={exportIncomeCsv} className="border border-line text-inkSoft text-xs px-3 py-1.5 rounded-md hover:bg-paperDark">ส่งออก CSV</button>
                  </div>
                  <div className="mb-3">
                    <input
                      type="text" placeholder="ค้นหาชื่อบริษัท..." value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
                      className="w-full md:w-64 border border-line rounded-md px-3 py-1.5 text-sm bg-paper"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-inkSoft border-b-2 border-dashed border-line">
                          <th className="py-1.5 px-2">วันวางบิล</th><th className="px-2">เลขที่บิล</th><th className="px-2">บริษัท</th><th className="px-2 text-right">ยอดวางบิล</th><th className="px-2">สถานะ</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIncome.map(i => {
                          const bd = new Date(i.bill_date + 'T00:00:00')
                          const days = Math.floor((today - bd) / 86400000)
                          return (
                            <tr key={i.id} className="border-b border-paperDark hover:bg-paperDark">
                              <td className="py-2.5 px-2">{fmtDateThai(i.bill_date)}</td>
                              <td className="px-2">{i.bill_number || '-'}</td>
                              <td className="px-2">{i.company}</td>
                              <td className="px-2 text-right font-semibold">{fmtMoney(i.amount)}</td>
                              <td className="px-2">
                                <button
                                  onClick={() => toggleIncomeStatus(i)}
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${i.status === 'transferred' ? 'bg-sage/20 text-sage' : 'bg-gold/20 text-gold'}`}
                                >
                                  {i.status === 'transferred' ? 'โอนแล้ว' : 'ยังไม่โอน'}
                                </button>
                                {i.status === 'pending' && days > 0 && <div className="text-rust text-[11px] mt-1">ค้างมา {days} วัน</div>}
                                {i.status === 'transferred' && i.transferred_date && <div className="text-inkSoft text-[11px] mt-1">โอนวันที่ {fmtDateThai(i.transferred_date)}</div>}
                              </td>
                              <td className="px-2">
                                <div className="flex gap-1">
                                  <button onClick={() => editIncome(i)} className="text-xs text-inkSoft hover:text-navy hover:bg-paperDark px-2 py-1 rounded">แก้ไข</button>
                                  <button onClick={() => deleteIncome(i.id)} className="text-xs text-inkSoft hover:text-rust hover:bg-paperDark px-2 py-1 rounded">ลบ</button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filteredIncome.length === 0 && (
                    <div className="text-center text-inkSoft text-sm py-6">
                      {companyFilter.trim() ? 'ไม่พบบริษัทนี้ในเดือนนี้' : 'ยังไม่มีรายการวางบิลในเดือนนี้'}
                    </div>
                  )}
                  <div className="text-right text-sm text-inkSoft mt-3">รวมยอดวางบิล{companyFilter.trim() ? 'ที่ค้นหา' : 'เดือนนี้'}: <b className="text-ink text-base">{fmtMoney(totalFilteredIncome)}</b></div>
                </div>
              </section>
            )}
          </>
        )}

        <footer className="text-center text-[11px] text-inkSoft mt-8">ข้อมูลผูกกับบัญชีที่ login เท่านั้น</footer>
      </div>
    </div>
  )
}
