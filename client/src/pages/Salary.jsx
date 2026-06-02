import { useState, useEffect } from 'react'
import { Users, DollarSign, Plus, Check, Download, ChevronDown, ChevronUp, Edit2 } from 'lucide-react'
import { PageHeader, SectionCard } from '@/components/ui/Cards'
import { StatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PAY_METHODS = ['bank_transfer', 'upi', 'cash', 'cheque']

function DeductionsPanel({ record, onUpdated }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deductions, setDeductions] = useState(record.deductions || [])
  const [saving, setSaving] = useState(false)

  const addRow = () => setDeductions(d => [...d, { description: '', amount: '' }])
  const removeRow = i => setDeductions(d => d.filter((_, idx) => idx !== i))
  const updateRow = (i, key, val) => setDeductions(d => { const n = [...d]; n[i] = { ...n[i], [key]: val }; return n })

  const save = async () => {
    const valid = deductions.filter(d => d.description && Number(d.amount) > 0)
    setSaving(true)
    try {
      const r = await api.updateDeductions(record._id, { deductions: valid.map(d => ({ description: d.description, amount: Number(d.amount) })) })
      toast.success('Deductions updated')
      setEditing(false)
      onUpdated(r.data)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const totalDeductions = (record.deductions || []).reduce((s, d) => s + d.amount, 0)

  if (record.status === 'paid') {
    return (
      <div>
        <button className="text-xs text-fg-3 hover:text-fg flex items-center gap-1" onClick={() => setOpen(o => !o)}>
          Deductions: {formatCurrency(totalDeductions)} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {open && (record.deductions || []).length > 0 && (
          <div className="mt-1 space-y-0.5 pl-2">
            {record.deductions.map((d, i) => (
              <p key={i} className="text-[11px] text-fg-3">{d.description}: {formatCurrency(d.amount)}</p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <button className="text-xs text-fg-3 hover:text-fg flex items-center gap-1" onClick={() => { setOpen(o => !o); setEditing(false) }}>
        Deductions: {formatCurrency(totalDeductions)} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]" style={{ minWidth: 260 }}>
          {editing ? (
            <>
              {deductions.map((d, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <input className="input text-xs flex-1" placeholder="Description" value={d.description} onChange={e => updateRow(i, 'description', e.target.value)} />
                  <input type="number" className="input text-xs w-24" placeholder="Amount" value={d.amount} onChange={e => updateRow(i, 'amount', e.target.value)} />
                  <button className="btn btn-ghost btn-sm text-danger text-xs px-1" onClick={() => removeRow(i)}>✕</button>
                </div>
              ))}
              <div className="flex gap-1 pt-1">
                <button className="btn btn-ghost btn-sm text-xs gap-1" onClick={addRow}><Plus size={10} /> Add</button>
                <button className="btn btn-primary btn-sm text-xs ml-auto" onClick={save} disabled={saving}>{saving ? '…' : 'Save'}</button>
                <button className="btn btn-secondary btn-sm text-xs" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              {(record.deductions || []).length === 0 ? (
                <p className="text-[11px] text-fg-3 italic">No deductions</p>
              ) : record.deductions.map((d, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-fg-2">{d.description}</span>
                  <span className="font-medium text-danger">-{formatCurrency(d.amount)}</span>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm text-xs gap-1 mt-1" onClick={() => { setEditing(true); setDeductions(record.deductions || []) }}><Edit2 size={10} /> Edit deductions</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Employees Tab ─────────────────────────────────────────────
function EmployeesTab() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [editSalaryId, setEditSalaryId] = useState(null)
  const [salaryInput, setSalaryInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getHrEmployees().then(r => { setEmployees(r.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const startEdit = (emp) => { setEditSalaryId(emp._id); setSalaryInput(String(emp.salary || '')) }

  const saveSalary = async (id) => {
    setSaving(true)
    try {
      const r = await api.updateEmployeeSalary(id, { salary: Number(salaryInput) || 0 })
      setEmployees(e => e.map(emp => emp._id === id ? { ...emp, salary: r.data.salary } : emp))
      setEditSalaryId(null)
      toast.success('Salary updated')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>

  return (
    <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
      <table>
        <thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Base Salary</th><th></th></tr></thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp._id}>
              <td><div className="flex items-center gap-2"><Avatar name={emp.name} size="xs" /><div><p className="text-sm font-medium text-fg">{emp.name}</p><p className="text-[10px] text-fg-3">{emp.email}</p></div></div></td>
              <td><span className="text-xs text-fg-2 capitalize">{(emp.role || '').replace(/_/g, ' ')}</span></td>
              <td><span className="text-xs text-fg-2">{emp.departmentId?.displayName || '—'}</span></td>
              <td>
                {editSalaryId === emp._id ? (
                  <div className="flex gap-1 items-center">
                    <input type="number" className="input text-xs w-32" value={salaryInput} onChange={e => setSalaryInput(e.target.value)} autoFocus />
                    <button className="btn btn-primary btn-sm text-[10px]" onClick={() => saveSalary(emp._id)} disabled={saving}><Check size={11} /></button>
                    <button className="btn btn-secondary btn-sm text-[10px]" onClick={() => setEditSalaryId(null)}>✕</button>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-fg">{emp.salary ? formatCurrency(emp.salary) : <span className="text-fg-3 text-xs italic">Not set</span>}</span>
                )}
              </td>
              <td>
                {editSalaryId !== emp._id && (
                  <button className="btn btn-ghost btn-sm text-[10px]" onClick={() => startEdit(emp)}><Edit2 size={11} /> Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Payroll Tab ───────────────────────────────────────────────
function PayrollTab() {
  const { toast } = useToast()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [newRecModal, setNewRecModal] = useState(false)
  const [newForm, setNewForm] = useState({ employeeId: '', bonus: '' })
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ paymentMethod: 'bank_transfer', transactionRef: '' })
  const [saving, setSaving] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const r = await api.getSalaryRecords(`?month=${month}&year=${year}&limit=100`)
      setRecords(r.data || [])
    } catch { toast.error('Failed to load payroll') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRecords() }, [month, year])
  useEffect(() => { api.getHrEmployees().then(r => setEmployees(r.data || [])).catch(() => {}) }, [])

  const generateRecord = async () => {
    if (!newForm.employeeId) { toast.error('Select an employee'); return }
    setSaving(true)
    try {
      await api.createSalaryRecord({ employeeId: newForm.employeeId, month, year, bonus: Number(newForm.bonus) || 0 })
      toast.success('Record created')
      setNewRecModal(false)
      setNewForm({ employeeId: '', bonus: '' })
      fetchRecords()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const markPaid = async () => {
    if (!payModal) return
    setSaving(true)
    try {
      await api.markSalaryPaid(payModal._id, payForm)
      toast.success('Marked as paid')
      setPayModal(null)
      fetchRecords()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const downloadSlip = async (rec) => {
    try {
      const r = await api.downloadPayslip(rec._id)
      if (!r.ok) throw new Error('Payslip not ready')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `Payslip-${rec.salaryId || rec._id}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { toast.error(err.message) }
  }

  const updateRecordInList = (updated) => {
    setRecords(rs => rs.map(r => r._id === updated._id ? updated : r))
  }

  const totalSalaries = records.reduce((s, r) => s + (r.netSalary || 0), 0)
  const paidCount = records.filter(r => r.status === 'paid').length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <select className="input text-sm w-36" value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <input type="number" className="input text-sm w-24" value={year} onChange={e => setYear(Number(e.target.value))} />
        <div className="flex-1" />
        <p className="text-xs text-fg-3">{paidCount}/{records.length} paid · Total: <strong>{formatCurrency(totalSalaries)}</strong></p>
        <button className="btn btn-primary gap-1 text-sm" onClick={() => setNewRecModal(true)}><Plus size={15} /> Add Record</button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="py-12 text-center text-fg-3 text-sm">No salary records for {SHORT_MONTHS[month]} {year}</div>
      ) : (
        <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
          <table>
            <thead><tr><th>Employee</th><th>Base</th><th>Bonus</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={rec.employeeId?.name || '?'} size="xs" />
                      <div>
                        <p className="text-sm font-medium text-fg">{rec.employeeId?.name || '—'}</p>
                        <p className="text-[10px] text-fg-3 capitalize">{(rec.employeeId?.role || '').replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-fg whitespace-nowrap">{formatCurrency(rec.baseSalary)}</td>
                  <td className="text-sm text-[var(--color-success)] whitespace-nowrap">{rec.bonus > 0 ? `+${formatCurrency(rec.bonus)}` : '—'}</td>
                  <td style={{ minWidth: 180 }}>
                    <DeductionsPanel record={rec} onUpdated={updateRecordInList} />
                  </td>
                  <td className="font-bold text-fg whitespace-nowrap">{formatCurrency(rec.netSalary)}</td>
                  <td>
                    <span className={`badge ${rec.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {rec.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {rec.status === 'pending' && (
                        <button className="btn btn-primary btn-sm text-[10px] whitespace-nowrap" onClick={() => { setPayModal(rec); setPayForm({ paymentMethod: 'bank_transfer', transactionRef: '' }) }}>
                          <Check size={11} /> Mark Paid
                        </button>
                      )}
                      {rec.status === 'paid' && rec.payslipUrl && (
                        <button className="btn btn-ghost btn-sm text-[10px]" onClick={() => downloadSlip(rec)} title="Download Payslip">
                          <Download size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Record Modal */}
      <Modal isOpen={newRecModal} onClose={() => setNewRecModal(false)} title={`Add Salary Record — ${SHORT_MONTHS[month]} ${year}`} size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setNewRecModal(false)}>Cancel</button><button className="btn btn-primary" onClick={generateRecord} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button></>}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Employee *</label>
            <select className="input" value={newForm.employeeId} onChange={e => setNewForm(f => ({ ...f, employeeId: e.target.value }))}>
              <option value="">Select employee</option>
              {employees.filter(e => e.role !== 'client').map(e => (
                <option key={e._id} value={e._id}>{e.name} {e.salary ? `(${formatCurrency(e.salary)}/mo)` : '(no salary set)'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Bonus (₹)</label>
            <input type="number" className="input" placeholder="0" value={newForm.bonus} onChange={e => setNewForm(f => ({ ...f, bonus: e.target.value }))} />
          </div>
          <p className="text-xs text-fg-3">Base salary is taken from the employee profile. Deductions can be added after creating the record.</p>
        </div>
      </Modal>

      {/* Mark Paid Modal */}
      <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title="Mark Salary as Paid" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button><button className="btn btn-primary" onClick={markPaid} disabled={saving}>{saving ? 'Saving…' : 'Confirm Payment'}</button></>}>
        {payModal && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[var(--color-surface-2)] text-sm">
              <p className="font-semibold text-fg">{payModal.employeeId?.name}</p>
              <p className="text-fg-3 text-xs mt-0.5">Net Salary: <strong className="text-fg">{formatCurrency(payModal.netSalary)}</strong></p>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1">Payment Method</label>
              <select className="input" value={payForm.paymentMethod} onChange={e => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {PAY_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1">Transaction Ref</label>
              <input className="input" placeholder="e.g. NEFT-JUN-2026" value={payForm.transactionRef} onChange={e => setPayForm(f => ({ ...f, transactionRef: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function SalaryPage() {
  const [tab, setTab] = useState('payroll')

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      <PageHeader title="Salary Management" subtitle="Employee salaries, deductions, and payroll" />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-2)] w-fit">
        {[['payroll', 'Payroll'], ['employees', 'Employees']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-[var(--color-surface)] text-fg shadow-sm' : 'text-fg-3 hover:text-fg'}`}>
            {label}
          </button>
        ))}
      </div>

      <SectionCard title={tab === 'payroll' ? 'Monthly Payroll' : 'Employee Salaries'}
        subtitle={tab === 'payroll' ? 'Create records, add deductions, and mark payments' : 'Set and manage base salaries per employee'}>
        {tab === 'payroll' ? <PayrollTab /> : <EmployeesTab />}
      </SectionCard>
    </div>
  )
}
