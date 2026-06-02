import { useState, useEffect } from 'react'
import { DollarSign, AlertCircle, CheckCircle, Plus, Send, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PageHeader, SectionCard, StatCard } from '@/components/ui/Cards'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency, formatDate } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const SVC_TYPES = ['social_media_management','meta_ads','reels','graphics','carousels','video_production','website_development','website_maintenance','content_writing','photography']
const SVC_LABEL = { social_media_management:'Social Media', meta_ads:'Meta Ads', reels:'Reels', graphics:'Graphics', carousels:'Carousels', video_production:'Video', website_development:'Website Dev', website_maintenance:'Web Maint.', content_writing:'Content', photography:'Photography' }
const PAY_METHODS = ['bank_transfer','upi','cash','cheque','card']
const EXPENSE_CATS = ['rent','utilities','software_tools','freelancer','equipment','office_supplies','marketing','travel','misc']
const EXPENSE_LABELS = { rent:'Rent', utilities:'Utilities', software_tools:'Software / Tools', freelancer:'Freelancer', equipment:'Equipment', office_supplies:'Office Supplies', marketing:'Marketing', travel:'Travel', misc:'Miscellaneous' }
const EMPTY_EXP = { category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], vendor: '', notes: '', recurring: false }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (<div className="card px-3 py-2 text-xs" style={{ minWidth: 140 }}>
    <p className="font-semibold text-fg mb-1">{label}</p>
    {payload.map(p => <p key={p.name} style={{ color: p.fill }}>{p.name}: {formatCurrency(p.value)}</p>)}
  </div>)
}

const EMPTY_LINE = { description: '', serviceType: '', quantity: 1, unitPrice: 0 }
const EMPTY_INV = { clientId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), lineItems: [{ ...EMPTY_LINE }], taxRate: 18, dueDate: '', notes: '' }
const EMPTY_PAY = { invoiceId: '', amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'bank_transfer', transactionRef: '', notes: '' }

export default function FinancePage() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState([])
  const [chartData, setChartData] = useState([])
  const [dash, setDash] = useState({})
  const [clients, setClients] = useState([])
  const [clientPayments, setClientPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('invoices')
  const [invModalOpen, setInvModalOpen] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [invForm, setInvForm] = useState({ ...EMPTY_INV })
  const [payForm, setPayForm] = useState({ ...EMPTY_PAY })
  const [saving, setSaving] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [expMonth, setExpMonth] = useState(new Date().getMonth() + 1)
  const [expYear, setExpYear] = useState(new Date().getFullYear())
  const [expModalOpen, setExpModalOpen] = useState(false)
  const [expForm, setExpForm] = useState({ ...EMPTY_EXP })

  const fetchAll = async () => {
    try {
      const [inv, chart, db, cp] = await Promise.all([api.getInvoices('?limit=100'), api.getRevenueChart(6), api.getDashboard(), api.getClientPayments()])
      setInvoices(inv.data)
      setChartData((chart.data || []).map(d => ({ month: `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.month]} ${d.year}`, expected: d.expected || 0, collected: d.collected || 0 })))
      setDash(db.data?.kpis || {})
      setClientPayments(cp.data || [])
    } catch { toast.error('Failed to load finance data') }
    finally { setLoading(false) }
  }
  const fetchExpenses = async () => {
    try {
      const r = await api.getExpenses(`?month=${expMonth}&year=${expYear}&limit=200`)
      setExpenses(r.data || [])
    } catch { toast.error('Failed to load expenses') }
  }

  useEffect(() => { fetchAll(); fetchExpenses() }, [])
  useEffect(() => { fetchExpenses() }, [expMonth, expYear])

  const openInvModal = async () => { setInvForm({ ...EMPTY_INV }); setInvModalOpen(true); try { const c = await api.getClients('?limit=100'); setClients(c.data) } catch {} }
  const openPayModal = (inv) => { setPayForm({ invoiceId: inv._id, amount: inv.totalAmount - inv.paidAmount, paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'bank_transfer', transactionRef: '', notes: '' }); setPayModalOpen(true) }

  const addLine = () => setInvForm(f => ({ ...f, lineItems: [...f.lineItems, { ...EMPTY_LINE }] }))
  const removeLine = i => setInvForm(f => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }))
  const updateLine = (i, key, val) => {
    setInvForm(f => { const items = [...f.lineItems]; items[i] = { ...items[i], [key]: val }; items[i].amount = items[i].quantity * items[i].unitPrice; return { ...f, lineItems: items } })
  }
  const subtotal = invForm.lineItems.reduce((s, l) => s + (l.quantity * l.unitPrice), 0)
  const tax = Math.round(subtotal * invForm.taxRate / 100)

  const submitInvoice = async () => {
    if (!invForm.clientId) { toast.error('Select a client'); return }
    if (invForm.lineItems.every(l => !l.description)) { toast.error('Add at least one line item'); return }
    setSaving(true)
    try {
      await api.createInvoice({ ...invForm, lineItems: invForm.lineItems.map(l => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), amount: Number(l.quantity) * Number(l.unitPrice) })) })
      toast.success('Invoice created!'); setInvModalOpen(false); fetchAll()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  const submitPayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try { await api.logPayment({ ...payForm, amount: Number(payForm.amount) }); toast.success('Payment logged!'); setPayModalOpen(false); fetchAll() }
    catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  const submitExpense = async () => {
    if (!expForm.category) { toast.error('Select a category'); return }
    if (!expForm.description) { toast.error('Enter a description'); return }
    if (!expForm.amount || Number(expForm.amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      await api.createExpense({ ...expForm, amount: Number(expForm.amount) })
      toast.success('Expense added')
      setExpModalOpen(false)
      setExpForm({ ...EMPTY_EXP })
      fetchExpenses()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    try {
      await api.deleteExpense(id)
      toast.success('Deleted')
      fetchExpenses()
    } catch (err) { toast.error(err.message) }
  }

  const sendInvoice = async (id) => { try { await api.sendInvoice(id); toast.success('Invoice sent!'); fetchAll() } catch (err) { toast.error(err.message) } }

  const downloadPdf = async (inv) => {
    try {
      const res = await api.downloadInvoicePdf(inv._id)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${inv.invoiceNumber || inv.invoiceId || 'invoice'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { toast.error(err.message) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>

  const totalBilled = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0)
  const totalCollected = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0)
  const totalOuts = totalBilled - totalCollected

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      <PageHeader title="Finance" subtitle="Revenue tracking, invoices, and payments">
        <button className="btn btn-primary gap-1.5 text-sm" onClick={openInvModal}><Plus size={16} /> New Invoice</button>
      </PageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard label="Expected MRR" value={formatCurrency(dash.expectedMRR || 0)} sub="Active clients" icon={DollarSign} variant="accent" />
        <StatCard label="Collected" value={formatCurrency(dash.collectedThisMonth || totalCollected)} sub={`${dash.expectedMRR ? Math.round((dash.collectedThisMonth || totalCollected) / dash.expectedMRR * 100) : 0}% collected`} icon={CheckCircle} variant="success" />
        <StatCard label="Outstanding" value={formatCurrency(totalOuts)} sub="Pending" icon={AlertCircle} variant="warning" />
        <StatCard label="Overdue" value={dash.overdueInvoices || 0} sub="Past due" icon={AlertCircle} variant="danger" />
      </div>

      {/* Revenue Chart */}
      <SectionCard title="Revenue Overview" subtitle="Expected vs collected by month">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} width={45} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="expected" name="Expected" fill="var(--color-surface-3)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="collected" name="Collected" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-2)] w-fit">
        {[['invoices', 'Invoices'], ['client-payments', 'Client Payments'], ['expenses', 'Expenses']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-[var(--color-surface)] text-fg shadow-sm' : 'text-fg-3 hover:text-fg'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Client Payments Tab */}
      {tab === 'client-payments' && (
        <SectionCard title="Client Payments" subtitle="Per-project payment status grouped by client">
          <div className="space-y-4">
            {clientPayments.length === 0 ? (
              <p className="text-sm text-fg-3 text-center py-8">No projects found. Create projects with contract values to track payments.</p>
            ) : clientPayments.map(cp => (
              <div key={cp.client._id} className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface-2)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
                      {(cp.client.companyName || cp.client.displayName || '?').charAt(0).toUpperCase()}
                    </div>
                    <p className="font-semibold text-fg text-sm">{cp.client.companyName || cp.client.displayName}</p>
                  </div>
                  <div className="flex gap-4 sm:gap-6 text-right">
                    <div><p className="text-[10px] text-fg-3">Contract</p><p className="text-xs font-bold text-fg">{formatCurrency(cp.totalContract)}</p></div>
                    <div><p className="text-[10px] text-fg-3">Paid</p><p className="text-xs font-bold text-[var(--color-success)]">{formatCurrency(cp.totalPaid)}</p></div>
                    <div><p className="text-[10px] text-fg-3">Balance</p><p className={`text-xs font-bold ${cp.totalBalance > 0 ? 'text-[var(--color-danger)]' : 'text-fg-3'}`}>{formatCurrency(cp.totalBalance)}</p></div>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[var(--color-border)]">
                    <th className="text-left px-4 py-2 text-[10px] font-semibold text-fg-3 uppercase tracking-wide">Project</th>
                    <th className="text-left px-2 py-2 text-[10px] font-semibold text-fg-3 uppercase tracking-wide hidden sm:table-cell">Status</th>
                    <th className="text-right px-2 py-2 text-[10px] font-semibold text-fg-3 uppercase tracking-wide">Contract</th>
                    <th className="text-right px-2 py-2 text-[10px] font-semibold text-fg-3 uppercase tracking-wide hidden sm:table-cell">Billed</th>
                    <th className="text-right px-2 py-2 text-[10px] font-semibold text-fg-3 uppercase tracking-wide">Paid</th>
                    <th className="text-right px-4 py-2 text-[10px] font-semibold text-fg-3 uppercase tracking-wide">Balance</th>
                  </tr></thead>
                  <tbody>
                    {cp.projects.map(p => (
                      <tr key={p._id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-fg text-xs">{p.name}</p>
                          <p className="text-[10px] text-fg-3 font-mono">{p.projectId}</p>
                        </td>
                        <td className="px-2 py-2.5 hidden sm:table-cell">
                          <span className={`badge text-[10px] badge-${p.status === 'active' ? 'success' : p.status === 'completed' ? 'info' : 'warning'}`}>{p.status}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right text-xs font-semibold text-fg whitespace-nowrap">{p.contractValue > 0 ? formatCurrency(p.contractValue) : <span className="text-fg-3">—</span>}</td>
                        <td className="px-2 py-2.5 text-right text-xs text-fg-2 whitespace-nowrap hidden sm:table-cell">{formatCurrency(p.billed)}</td>
                        <td className="px-2 py-2.5 text-right text-xs font-semibold text-[var(--color-success)] whitespace-nowrap">{formatCurrency(p.paid)}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {p.balance > 0
                            ? <span className="text-xs font-bold text-[var(--color-danger)]">{formatCurrency(p.balance)}</span>
                            : <span className="text-xs text-fg-3">Settled</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Invoices Table */}
      {tab === 'invoices' && <SectionCard title="Invoices" subtitle="All invoices">
        <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
          <table><thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>{invoices.map(inv => {
            const owed = (inv.totalAmount || 0) - (inv.paidAmount || 0)
            return (
              <tr key={inv._id}>
                <td><p className="font-mono text-xs font-semibold text-fg whitespace-nowrap">{inv.invoiceNumber || inv.invoiceId}</p></td>
                <td><div className="flex items-center gap-2"><Avatar name={inv.clientId?.companyName || '—'} size="xs" /><span className="text-sm text-fg-2 truncate" style={{ maxWidth: 120 }}>{inv.clientId?.companyName || '—'}</span></div></td>
                <td className="font-semibold text-fg whitespace-nowrap">{formatCurrency(inv.totalAmount)}</td>
                <td className="font-semibold text-[var(--color-success)] whitespace-nowrap">{formatCurrency(inv.paidAmount)}</td>
                <td className="text-xs text-fg-2 whitespace-nowrap">{formatDate(inv.dueDate, { year: undefined })}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td>
                  <div className="flex gap-1">
                    {inv.status === 'draft' && <button className="btn btn-secondary btn-sm text-[10px] whitespace-nowrap" onClick={() => sendInvoice(inv._id)}><Send size={11} /> Send</button>}
                    {['sent', 'partial', 'overdue'].includes(inv.status) && <button className="btn btn-primary btn-sm text-[10px] whitespace-nowrap" onClick={() => openPayModal(inv)}><Plus size={11} /> Pay</button>}
                    <button className="btn btn-ghost btn-sm text-[10px] whitespace-nowrap" onClick={() => downloadPdf(inv)} title="Download PDF"><Download size={11} /></button>
                  </div>
                </td>
              </tr>
            )
          })}</tbody></table>
        </div>
        <div className="flex items-center justify-end gap-4 sm:gap-6 pt-3 border-t border-[var(--color-border)] px-3 sm:px-4 text-sm flex-wrap">
          <div className="text-right"><p className="text-[10px] sm:text-xs text-fg-3">Total Billed</p><p className="font-bold text-fg text-xs sm:text-sm">{formatCurrency(totalBilled)}</p></div>
          <div className="text-right"><p className="text-[10px] sm:text-xs text-fg-3">Collected</p><p className="font-bold text-[var(--color-success)] text-xs sm:text-sm">{formatCurrency(totalCollected)}</p></div>
          <div className="text-right"><p className="text-[10px] sm:text-xs text-fg-3">Outstanding</p><p className="font-bold text-[var(--color-danger)] text-xs sm:text-sm">{formatCurrency(totalOuts)}</p></div>
        </div>
      </SectionCard>}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          {/* Filter + add row */}
          <div className="flex flex-wrap items-center gap-3">
            <select className="input" style={{ width: 120 }} value={expMonth} onChange={e => setExpMonth(Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>{['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]}</option>
              ))}
            </select>
            <select className="input" style={{ width: 90 }} value={expYear} onChange={e => setExpYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="ml-auto">
              <button className="btn btn-primary btn-sm gap-1" onClick={() => { setExpForm({ ...EMPTY_EXP }); setExpModalOpen(true) }}>
                <Plus size={14} /> Add Expense
              </button>
            </div>
          </div>

          {/* Category chart */}
          {(() => {
            const catData = EXPENSE_CATS.map(cat => ({
              name: EXPENSE_LABELS[cat],
              total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
            })).filter(d => d.total > 0)
            return catData.length > 0 ? (
              <SectionCard title="By Category">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={catData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} width={42} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Amount" fill="var(--color-warning)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
            ) : null
          })()}

          {/* Expenses table */}
          <SectionCard
            title="Expenses"
            subtitle={`${expenses.length} record${expenses.length !== 1 ? 's' : ''} · Total: ${formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}`}
          >
            {expenses.length === 0 ? (
              <p className="text-sm text-fg-3 text-center py-10">No expenses recorded for this month.</p>
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                <table>
                  <thead><tr>
                    <th>Date</th><th>Category</th><th>Vendor</th><th>Description</th>
                    <th className="text-right">Amount</th><th></th>
                  </tr></thead>
                  <tbody>
                    {expenses.map(exp => (
                      <tr key={exp._id}>
                        <td className="text-xs text-fg-2 whitespace-nowrap">{formatDate(exp.date)}</td>
                        <td>
                          <span className="badge badge-warning text-[10px]">{EXPENSE_LABELS[exp.category] || exp.category}</span>
                          {exp.recurring && <span className="badge badge-info text-[10px] ml-1">Recurring</span>}
                        </td>
                        <td className="text-xs text-fg-2">{exp.vendor || '—'}</td>
                        <td className="text-xs text-fg max-w-[200px] truncate">{exp.description}</td>
                        <td className="text-right font-semibold text-fg whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm text-[var(--color-danger)] text-xs" onClick={() => deleteExpense(exp._id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* New Invoice Modal */}
      <Modal isOpen={invModalOpen} onClose={() => setInvModalOpen(false)} title="New Invoice" size="lg" footer={
        <><button className="btn btn-secondary" onClick={() => setInvModalOpen(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={submitInvoice} disabled={saving}>{saving ? 'Creating…' : 'Create Invoice'}</button></>
      }>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Client *</label>
            <select className="input" value={invForm.clientId} onChange={e => setInvForm(f => ({ ...f, clientId: e.target.value }))}>
              <option value="">Select client</option>{clients.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
            </select></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Month</label>
            <select className="input" value={invForm.month} onChange={e => setInvForm(f => ({ ...f, month: Number(e.target.value) }))}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]}</option>)}
            </select></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Due Date</label>
            <input type="date" className="input" value={invForm.dueDate} onChange={e => setInvForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
          </div>

          {/* Line Items — responsive card layout on mobile, grid on desktop */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-fg-2">Line Items</label>
              <button className="btn btn-ghost btn-sm text-xs gap-1" onClick={addLine}><Plus size={12} /> Add Line</button>
            </div>
            <div className="space-y-3">
              {invForm.lineItems.map((line, i) => (
                <div key={i} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-end sm:p-0 sm:bg-transparent sm:border-0 sm:rounded-none">
                  <div className="sm:col-span-4"><label className="text-[10px] text-fg-3 mb-0.5 block sm:hidden">Description</label><input className="input text-xs" placeholder="Description" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} /></div>
                  <div className="sm:col-span-2"><label className="text-[10px] text-fg-3 mb-0.5 block sm:hidden">Service Type</label>
                    <select className="input text-xs" value={line.serviceType} onChange={e => updateLine(i, 'serviceType', e.target.value)}>
                      <option value="">Type</option>{SVC_TYPES.map(s => <option key={s} value={s}>{SVC_LABEL[s]}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:contents">
                    <div className="sm:col-span-1"><label className="text-[10px] text-fg-3 mb-0.5 block sm:hidden">Qty</label><input type="number" className="input text-xs" placeholder="Qty" value={line.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))} /></div>
                    <div className="sm:col-span-2"><label className="text-[10px] text-fg-3 mb-0.5 block sm:hidden">Unit ₹</label><input type="number" className="input text-xs" placeholder="Unit ₹" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', Number(e.target.value))} /></div>
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end">
                      <span className="text-xs font-semibold text-fg sm:py-2">{formatCurrency(line.quantity * line.unitPrice)}</span>
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex justify-end">{invForm.lineItems.length > 1 && <button className="btn btn-ghost btn-sm text-danger text-xs" onClick={() => removeLine(i)}>✕</button>}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-4 sm:gap-6 pt-2 border-t border-[var(--color-border)]">
            <div className="text-right"><p className="text-[10px] text-fg-3">Subtotal</p><p className="text-sm font-semibold text-fg">{formatCurrency(subtotal)}</p></div>
            <div className="text-right"><p className="text-[10px] text-fg-3">GST ({invForm.taxRate}%)</p><p className="text-sm font-semibold text-fg">{formatCurrency(tax)}</p></div>
            <div className="text-right"><p className="text-[10px] text-fg-3">Total</p><p className="text-sm font-bold text-accent">{formatCurrency(subtotal + tax)}</p></div>
          </div>
        </div>
      </Modal>

      {/* Log Payment Modal */}
      <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Log Payment" size="sm" footer={
        <><button className="btn btn-secondary" onClick={() => setPayModalOpen(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={submitPayment} disabled={saving}>{saving ? 'Logging…' : 'Log Payment'}</button></>
      }>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Amount (₹) *</label>
          <input type="number" className="input" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Payment Date</label>
            <input type="date" className="input" value={payForm.paymentDate} onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Method</label>
            <select className="input" value={payForm.paymentMethod} onChange={e => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}>
              {PAY_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select></div>
          </div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Transaction Ref</label>
          <input className="input" value={payForm.transactionRef} onChange={e => setPayForm(f => ({ ...f, transactionRef: e.target.value }))} placeholder="e.g. NEFT-MAY-001" /></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Notes</label>
          <input className="input" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
      </Modal>

      {/* Add Expense Modal */}
      <Modal isOpen={expModalOpen} onClose={() => setExpModalOpen(false)} title="Add Expense" size="sm" footer={
        <><button className="btn btn-secondary" onClick={() => setExpModalOpen(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={submitExpense} disabled={saving}>{saving ? 'Saving…' : 'Add Expense'}</button></>
      }>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Category *</label>
          <select className="input" value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
            <option value="">Select category</option>
            {EXPENSE_CATS.map(c => <option key={c} value={c}>{EXPENSE_LABELS[c]}</option>)}
          </select></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Description *</label>
          <input className="input" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Adobe Creative Cloud May" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Amount (₹) *</label>
            <input type="number" className="input" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Date *</label>
            <input type="date" className="input" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Vendor</label>
          <input className="input" value={expForm.vendor} onChange={e => setExpForm(f => ({ ...f, vendor: e.target.value }))} placeholder="e.g. Adobe Inc." /></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Notes</label>
          <input className="input" value={expForm.notes} onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={expForm.recurring} onChange={e => setExpForm(f => ({ ...f, recurring: e.target.checked }))} className="rounded" />
            <span className="text-xs text-fg-2">Recurring monthly expense</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
