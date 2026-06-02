# CRM Remaining Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the four missing frontend pieces from the Phase 2 spec: Expenses + P&L tabs in Finance, internal Tickets page, and portal Tickets page.

**Architecture:** All backend is already built (controllers, models, routes). This plan is frontend-only. New API methods are added to `api.js` first, then each feature is added in dependency order. Tasks 2–5 are independent of each other once Task 1 is done.

**Tech Stack:** React 19, Vite, Tailwind CSS, Recharts (already installed), Lucide icons, existing `api.js` client

---

## File Map

| Status | File | Change |
|--------|------|--------|
| Modify | `client/src/lib/api.js` | Add expense, ticket, P&L API methods |
| Modify | `client/src/pages/Finance.jsx` | Add Expenses tab + P&L tab |
| Create | `client/src/pages/Tickets.jsx` | Internal support tickets list + detail modal |
| Create | `client/src/pages/portal/PortalTickets.jsx` | Client-facing ticket raise + thread view |
| Modify | `client/src/components/layout/Sidebar.jsx` | Add Tickets nav item |
| Modify | `client/src/components/layout/ClientLayout.jsx` | Add Support nav item |
| Modify | `client/src/App.jsx` | Add `/tickets` and `/portal/tickets` routes |

---

## Task 1: Add API methods to api.js

**Files:**
- Modify: `client/src/lib/api.js`

- [ ] **Step 1: Add expense, P&L, and ticket methods**

  Open `client/src/lib/api.js`. After the existing `getMySalaryRecords` / `downloadPayslip` block and before the closing `}`, add:

  ```js
  // Expenses
  getExpenses(q = '') { return this.get(`/expenses${q}`) }
  createExpense(d) { return this.post('/expenses', d) }
  updateExpense(id, d) { return this.patch(`/expenses/${id}`, d) }
  deleteExpense(id) { return this.del(`/expenses/${id}`) }

  // P&L
  getPL(months = 6) { return this.get(`/stats/pl?months=${months}`) }

  // Support Tickets
  getTickets(q = '') { return this.get(`/tickets${q}`) }
  getTicket(id) { return this.get(`/tickets/${id}`) }
  createTicket(d) { return this.post('/tickets', d) }
  updateTicketStatus(id, d) { return this.patch(`/tickets/${id}/status`, d) }
  assignTicket(id, d) { return this.patch(`/tickets/${id}/assign`, d) }
  addTicketReply(id, d) { return this.post(`/tickets/${id}/reply`, d) }
  ```

- [ ] **Step 2: Verify no syntax errors**

  ```bash
  cd /Users/archismandutta/IH/ZRCCRM/zrcnewcrm/client
  node --input-type=module --eval "import('./src/lib/api.js')" 2>&1 || npx vite build --mode development 2>&1 | head -20
  ```

  Expected: no import errors. If Vite isn't available yet just do a quick syntax check with node.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/archismandutta/IH/ZRCCRM/zrcnewcrm
  git add client/src/lib/api.js
  git commit -m "feat: add expense, ticket, and P&L API methods to api client"
  ```

---

## Task 2: Finance — Expenses tab

**Files:**
- Modify: `client/src/pages/Finance.jsx`

The Finance page currently has two tabs: `invoices` and `client-payments`. We add an `expenses` tab. The existing `BarChart` / `ResponsiveContainer` imports from recharts are already there.

- [ ] **Step 1: Add expense constants and state at top of FinancePage**

  After the existing `const PAY_METHODS = [...]` line, add:

  ```js
  const EXPENSE_CATS = ['rent','utilities','software_tools','freelancer','equipment','office_supplies','marketing','travel','misc']
  const EXPENSE_LABELS = { rent:'Rent', utilities:'Utilities', software_tools:'Software / Tools', freelancer:'Freelancer', equipment:'Equipment', office_supplies:'Office Supplies', marketing:'Marketing', travel:'Travel', misc:'Miscellaneous' }
  const EMPTY_EXP = { category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], vendor: '', notes: '', recurring: false }
  ```

  Inside the `FinancePage` function, after the existing state declarations, add:

  ```js
  const [expenses, setExpenses] = useState([])
  const [expMonth, setExpMonth] = useState(new Date().getMonth() + 1)
  const [expYear, setExpYear] = useState(new Date().getFullYear())
  const [expModalOpen, setExpModalOpen] = useState(false)
  const [expForm, setExpForm] = useState({ ...EMPTY_EXP })
  ```

- [ ] **Step 2: Add fetchExpenses and wire into useEffect**

  Add the fetch function inside `FinancePage` (after `fetchAll`):

  ```js
  const fetchExpenses = async () => {
    try {
      const r = await api.getExpenses(`?month=${expMonth}&year=${expYear}&limit=200`)
      setExpenses(r.data || [])
    } catch { toast.error('Failed to load expenses') }
  }
  ```

  Update the existing `useEffect(() => { fetchAll() }, [])` to also call `fetchExpenses`:

  ```js
  useEffect(() => { fetchAll(); fetchExpenses() }, [])
  ```

  Add a second `useEffect` so the expense list refreshes when month/year filters change:

  ```js
  useEffect(() => { fetchExpenses() }, [expMonth, expYear])
  ```

- [ ] **Step 3: Add submitExpense handler**

  ```js
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
  ```

- [ ] **Step 4: Update tab switcher to include Expenses**

  Find the line:
  ```js
  {[['invoices', 'Invoices'], ['client-payments', 'Client Payments']].map(([key, label]) => (
  ```

  Replace with:
  ```js
  {[['invoices', 'Invoices'], ['client-payments', 'Client Payments'], ['expenses', 'Expenses']].map(([key, label]) => (
  ```

- [ ] **Step 5: Add Expenses tab content block**

  Add the following JSX block after the existing `{tab === 'invoices' && ...}` close and before the `{/* New Invoice Modal */}` comment:

  ```jsx
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
  ```

- [ ] **Step 6: Add Expense modal**

  Add after the existing `{/* Log Payment Modal */}` close tag (before the final `</div>`):

  ```jsx
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
  ```

- [ ] **Step 7: Verify Finance page loads and Expenses tab renders**

  Start the dev servers and open `http://localhost:5173`. Navigate to Finance → Expenses tab. Confirm the month/year filter, table, and Add Expense button are visible.

- [ ] **Step 8: Commit**

  ```bash
  cd /Users/archismandutta/IH/ZRCCRM/zrcnewcrm
  git add client/src/pages/Finance.jsx
  git commit -m "feat: add Expenses tab to Finance page"
  ```

---

## Task 3: Finance — P&L tab

**Files:**
- Modify: `client/src/pages/Finance.jsx`

- [ ] **Step 1: Add LineChart to recharts import**

  Find the existing recharts import line:
  ```js
  import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
  ```

  Replace with:
  ```js
  import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
  ```

- [ ] **Step 2: Add P&L state**

  After the expense state block (from Task 2), add:

  ```js
  const [plData, setPlData] = useState([])
  const [plMonths, setPlMonths] = useState(6)
  ```

- [ ] **Step 3: Add fetchPL and wire into useEffect**

  Add after `fetchExpenses`:

  ```js
  const fetchPL = async (m = plMonths) => {
    try {
      const r = await api.getPL(m)
      setPlData(r.data || [])
    } catch { toast.error('Failed to load P&L data') }
  }
  ```

  Update `useEffect(() => { fetchAll(); fetchExpenses() }, [])` to:

  ```js
  useEffect(() => { fetchAll(); fetchExpenses(); fetchPL() }, [])
  ```

  Add a `useEffect` for the months picker:

  ```js
  useEffect(() => { fetchPL(plMonths) }, [plMonths])
  ```

- [ ] **Step 4: Add P&L to tab switcher**

  Find the updated tabs array from Task 2:
  ```js
  {[['invoices', 'Invoices'], ['client-payments', 'Client Payments'], ['expenses', 'Expenses']].map(
  ```

  Replace with:
  ```js
  {[['invoices', 'Invoices'], ['client-payments', 'Client Payments'], ['expenses', 'Expenses'], ['pl', 'P & L']].map(
  ```

- [ ] **Step 5: Add P&L tab content block**

  Add after the `{tab === 'expenses' && ...}` closing tag:

  ```jsx
  {/* P&L Tab */}
  {tab === 'pl' && (
    <div className="space-y-4">
      {/* Range picker */}
      <div className="flex items-center gap-2 flex-wrap">
        {[3, 6, 12].map(m => (
          <button key={m} onClick={() => setPlMonths(m)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${plMonths === m ? 'bg-accent text-white' : 'bg-[var(--color-surface-2)] text-fg-3 hover:text-fg'}`}>
            {m} months
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {(() => {
        const totRev  = plData.reduce((s, d) => s + d.revenue, 0)
        const totExp  = plData.reduce((s, d) => s + d.expenses, 0)
        const totSal  = plData.reduce((s, d) => s + d.salaries, 0)
        const totProf = plData.reduce((s, d) => s + d.netProfit, 0)
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue',   value: totRev,  colour: 'var(--color-accent)' },
              { label: 'Total Expenses',  value: totExp,  colour: 'var(--color-warning)' },
              { label: 'Total Salaries',  value: totSal,  colour: 'var(--color-info)' },
              { label: 'Net Profit',      value: totProf, colour: totProf >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
            ].map(card => (
              <div key={card.label} className="card p-4">
                <p className="text-[10px] text-fg-3 uppercase tracking-wide mb-1">{card.label}</p>
                <p className="text-lg font-bold" style={{ color: card.colour }}>{formatCurrency(card.value)}</p>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Line chart */}
      {plData.length > 0 && (
        <SectionCard title="Revenue vs Costs vs Net Profit">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={plData.map(d => ({
              month: `${d.month} ${d.year}`,
              Revenue: d.revenue,
              Costs: d.expenses + d.salaries,
              Profit: d.netProfit,
            }))} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} width={46} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Revenue" stroke="var(--color-accent)"  strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Costs"   stroke="var(--color-warning)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Profit"  stroke="var(--color-success)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {plData.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-sm text-fg-3">No data yet. Add expenses and log payments to see P&amp;L.</p>
        </div>
      )}
    </div>
  )}
  ```

- [ ] **Step 6: Verify P&L tab renders**

  Open Finance → P&L tab. Confirm 3/6/12 month picker appears, summary cards show, chart renders (may show zeroes with no data — that is fine).

- [ ] **Step 7: Commit**

  ```bash
  cd /Users/archismandutta/IH/ZRCCRM/zrcnewcrm
  git add client/src/pages/Finance.jsx
  git commit -m "feat: add P&L tab to Finance page"
  ```

---

## Task 4: Internal Tickets page

**Files:**
- Create: `client/src/pages/Tickets.jsx`

- [ ] **Step 1: Create Tickets.jsx**

  Create `client/src/pages/Tickets.jsx` with the following content:

  ```jsx
  import { useState, useEffect } from 'react'
  import { Plus, ChevronRight, Send } from 'lucide-react'
  import { PageHeader, SectionCard } from '@/components/ui/Cards'
  import { StatusBadge } from '@/components/ui/Badge'
  import { Avatar } from '@/components/ui/Avatar'
  import Modal from '@/components/ui/Modal'
  import { formatDate } from '@/lib/utils'
  import { useToast } from '@/components/ui/Toast'
  import { useAuth } from '@/lib/auth'
  import api from '@/lib/api'

  const STATUSES = ['open', 'in_progress', 'resolved']
  const PRIORITIES = ['low', 'medium', 'high']
  const PRIORITY_COLOUR = { low: 'badge-info', medium: 'badge-warning', high: 'badge-danger' }
  const STATUS_COLOUR    = { open: 'badge-danger', in_progress: 'badge-warning', resolved: 'badge-success' }

  const EMPTY_FORM = { clientId: '', title: '', description: '', priority: 'medium' }

  export default function TicketsPage() {
    const { toast } = useToast()
    const { user }  = useAuth()
    const isAdmin   = ['super_admin', 'admin'].includes(user?.role)

    const [tickets, setTickets]         = useState([])
    const [clients, setClients]         = useState([])
    const [users,   setUsers]           = useState([])
    const [loading, setLoading]         = useState(true)
    const [filterStatus,   setFilterStatus]   = useState('')
    const [filterPriority, setFilterPriority] = useState('')
    const [selected, setSelected]       = useState(null)   // full ticket object for detail modal
    const [detailOpen, setDetailOpen]   = useState(false)
    const [createOpen, setCreateOpen]   = useState(false)
    const [form,   setForm]             = useState({ ...EMPTY_FORM })
    const [reply,  setReply]            = useState('')
    const [saving, setSaving]           = useState(false)
    const [sendingReply, setSendingReply] = useState(false)

    const fetchTickets = async () => {
      try {
        const q = [
          filterStatus   ? `status=${filterStatus}`   : '',
          filterPriority ? `priority=${filterPriority}` : '',
          'limit=200',
        ].filter(Boolean).join('&')
        const r = await api.getTickets(q ? `?${q}` : '')
        setTickets(r.data || [])
      } catch { toast.error('Failed to load tickets') }
      finally { setLoading(false) }
    }

    useEffect(() => { fetchTickets() }, [filterStatus, filterPriority])

    useEffect(() => {
      if (isAdmin) {
        api.getClients('?limit=200').then(r => setClients(r.data || [])).catch(() => {})
        api.getUsers('?limit=200').then(r => setUsers(r.data || [])).catch(() => {})
      }
    }, [isAdmin])

    const openDetail = async (ticket) => {
      try {
        const r = await api.getTicket(ticket._id)
        setSelected(r.data)
        setDetailOpen(true)
        setReply('')
      } catch { toast.error('Failed to load ticket') }
    }

    const submitCreate = async () => {
      if (!form.title || !form.description) { toast.error('Title and description required'); return }
      if (isAdmin && !form.clientId) { toast.error('Select a client'); return }
      setSaving(true)
      try {
        await api.createTicket(form)
        toast.success('Ticket created')
        setCreateOpen(false)
        setForm({ ...EMPTY_FORM })
        fetchTickets()
      } catch (err) { toast.error(err.message) }
      finally { setSaving(false) }
    }

    const submitReply = async () => {
      if (!reply.trim()) return
      setSendingReply(true)
      try {
        const r = await api.addTicketReply(selected._id, { message: reply.trim() })
        setSelected(r.data)
        setReply('')
        fetchTickets()
      } catch (err) { toast.error(err.message) }
      finally { setSendingReply(false) }
    }

    const changeStatus = async (ticketId, status) => {
      try {
        await api.updateTicketStatus(ticketId, { status })
        toast.success('Status updated')
        const r = await api.getTicket(ticketId)
        setSelected(r.data)
        fetchTickets()
      } catch (err) { toast.error(err.message) }
    }

    const changeAssign = async (ticketId, assignedTo) => {
      try {
        await api.assignTicket(ticketId, { assignedTo })
        toast.success('Assigned')
        const r = await api.getTicket(ticketId)
        setSelected(r.data)
        fetchTickets()
      } catch (err) { toast.error(err.message) }
    }

    const filtered = tickets

    return (
      <div className="space-y-4 animate-slide-up">
        <PageHeader title="Support Tickets" subtitle="Client support requests">
          <button className="btn btn-primary btn-sm gap-1" onClick={() => { setForm({ ...EMPTY_FORM }); setCreateOpen(true) }}>
            <Plus size={15} /> New Ticket
          </button>
        </PageHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select className="input" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
          <select className="input" style={{ width: 130 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>

        {/* Table */}
        <SectionCard title={`Tickets (${filtered.length})`}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-fg-3 text-center py-10">No tickets found.</p>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table>
                <thead><tr>
                  <th>ID</th><th>Client</th><th>Title</th><th>Priority</th>
                  <th>Status</th><th>Assigned</th><th>Raised</th><th></th>
                </tr></thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t._id} className="cursor-pointer" onClick={() => openDetail(t)}>
                      <td><span className="font-mono text-xs text-fg-2">{t.ticketId}</span></td>
                      <td><span className="text-xs text-fg-2">{t.clientId?.companyName || t.clientId?.displayName || '—'}</span></td>
                      <td><span className="text-sm font-medium text-fg">{t.title}</span></td>
                      <td><span className={`badge text-[10px] ${PRIORITY_COLOUR[t.priority]}`}>{t.priority}</span></td>
                      <td><span className={`badge text-[10px] ${STATUS_COLOUR[t.status]}`}>{t.status.replace(/_/g,' ')}</span></td>
                      <td>
                        {t.assignedTo
                          ? <div className="flex items-center gap-1"><Avatar name={t.assignedTo.name} size="xs" /><span className="text-xs text-fg-2">{t.assignedTo.name}</span></div>
                          : <span className="text-xs text-fg-3">—</span>}
                      </td>
                      <td className="text-xs text-fg-2 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                      <td><ChevronRight size={14} className="text-fg-3" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Detail Modal */}
        {selected && (
          <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`${selected.ticketId} — ${selected.title}`} size="lg">
            <div className="space-y-4">
              {/* Controls (admin only) */}
              {isAdmin && (
                <div className="flex flex-wrap gap-3">
                  <div>
                    <label className="block text-[10px] text-fg-3 mb-1 uppercase tracking-wide">Status</label>
                    <select className="input text-xs" style={{ width: 140 }} value={selected.status}
                      onChange={e => changeStatus(selected._id, e.target.value)}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-fg-3 mb-1 uppercase tracking-wide">Assigned To</label>
                    <select className="input text-xs" style={{ width: 160 }} value={selected.assignedTo?._id || ''}
                      onChange={e => changeAssign(selected._id, e.target.value)}>
                      <option value="">Unassigned</option>
                      {users.filter(u => u.role !== 'client').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-fg-3">Priority</p>
                    <span className={`badge text-[10px] ${PRIORITY_COLOUR[selected.priority]}`}>{selected.priority}</span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
                <p className="text-[10px] text-fg-3 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-fg whitespace-pre-wrap">{selected.description}</p>
                <p className="text-[10px] text-fg-3 mt-2">Raised by {selected.raisedBy?.name} · {formatDate(selected.createdAt)}</p>
              </div>

              {/* Replies */}
              {(selected.replies || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-fg-3 uppercase tracking-wide">Replies</p>
                  {selected.replies.map((r, i) => {
                    const isTeam = r.userId?.role !== 'client'
                    return (
                      <div key={i} className={`rounded-xl p-3 ${isTeam ? 'bg-accent/8 border border-accent/20' : 'bg-[var(--color-surface-2)]'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar name={r.userId?.name || '?'} size="xs" />
                          <span className="text-xs font-semibold text-fg">{r.userId?.name || 'Unknown'}</span>
                          {isTeam && <span className="badge badge-info text-[10px]">Team</span>}
                          <span className="text-[10px] text-fg-3 ml-auto">{formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-sm text-fg-2 whitespace-pre-wrap">{r.message}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Reply form */}
              {selected.status !== 'resolved' && (
                <div className="flex gap-2">
                  <textarea
                    className="input flex-1 resize-none text-sm"
                    rows={2}
                    placeholder="Write a reply…"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply() }}
                  />
                  <button className="btn btn-primary btn-sm self-end gap-1" onClick={submitReply} disabled={sendingReply || !reply.trim()}>
                    <Send size={13} /> {sendingReply ? '…' : 'Send'}
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Create Ticket Modal */}
        <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Support Ticket" size="sm" footer={
          <><button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={submitCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Ticket'}</button></>
        }>
          <div className="space-y-3">
            {isAdmin && (
              <div><label className="block text-xs font-medium text-fg-2 mb-1">Client *</label>
              <select className="input" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                <option value="">Select client</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.companyName || c.displayName}</option>)}
              </select></div>
            )}
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Short summary of the issue" /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Description *</label>
            <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail…" /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Priority</label>
            <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select></div>
          </div>
        </Modal>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd /Users/archismandutta/IH/ZRCCRM/zrcnewcrm
  git add client/src/pages/Tickets.jsx
  git commit -m "feat: create internal Tickets page with list, detail, and reply"
  ```

---

## Task 5: Portal Tickets page

**Files:**
- Create: `client/src/pages/portal/PortalTickets.jsx`

- [ ] **Step 1: Create PortalTickets.jsx**

  Create `client/src/pages/portal/PortalTickets.jsx`:

  ```jsx
  import { useState, useEffect } from 'react'
  import { Plus, ChevronLeft, Send, LifeBuoy } from 'lucide-react'
  import { StatusBadge } from '@/components/ui/Badge'
  import { Avatar } from '@/components/ui/Avatar'
  import Modal from '@/components/ui/Modal'
  import { formatDate } from '@/lib/utils'
  import { useToast } from '@/components/ui/Toast'
  import api from '@/lib/api'

  const PRIORITIES = ['low', 'medium', 'high']
  const STATUS_COLOUR   = { open: 'badge-danger', in_progress: 'badge-warning', resolved: 'badge-success' }
  const PRIORITY_COLOUR = { low: 'badge-info', medium: 'badge-warning', high: 'badge-danger' }
  const EMPTY_FORM = { title: '', description: '', priority: 'medium' }

  export default function PortalTickets() {
    const { toast } = useToast()
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [form, setForm] = useState({ ...EMPTY_FORM })
    const [reply, setReply] = useState('')
    const [saving, setSaving] = useState(false)
    const [sendingReply, setSendingReply] = useState(false)

    const fetchTickets = async () => {
      try {
        const r = await api.getTickets('?limit=200')
        setTickets(r.data || [])
      } catch { toast.error('Failed to load tickets') }
      finally { setLoading(false) }
    }

    useEffect(() => { fetchTickets() }, [])

    const openDetail = async (ticket) => {
      try {
        const r = await api.getTicket(ticket._id)
        setSelected(r.data)
        setReply('')
      } catch { toast.error('Failed to load ticket') }
    }

    const submitCreate = async () => {
      if (!form.title || !form.description) { toast.error('Title and description required'); return }
      setSaving(true)
      try {
        await api.createTicket(form)
        toast.success('Ticket raised! Our team will respond shortly.')
        setCreateOpen(false)
        setForm({ ...EMPTY_FORM })
        fetchTickets()
      } catch (err) { toast.error(err.message) }
      finally { setSaving(false) }
    }

    const submitReply = async () => {
      if (!reply.trim() || !selected) return
      setSendingReply(true)
      try {
        const r = await api.addTicketReply(selected._id, { message: reply.trim() })
        setSelected(r.data)
        setReply('')
        fetchTickets()
      } catch (err) { toast.error(err.message) }
      finally { setSendingReply(false) }
    }

    // Thread detail view
    if (selected) {
      return (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm gap-1 text-fg-3 hover:text-fg" onClick={() => setSelected(null)}>
              <ChevronLeft size={15} /> Back to Tickets
            </button>
          </div>

          <div className="card p-4 space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-fg-3">{selected.ticketId}</p>
                <h2 className="text-base font-bold text-fg mt-0.5">{selected.title}</h2>
              </div>
              <span className={`badge text-[10px] ${STATUS_COLOUR[selected.status]} flex-shrink-0`}>
                {selected.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-fg-3">Raised {formatDate(selected.createdAt)} · Priority: <span className="capitalize">{selected.priority}</span></p>
          </div>

          {/* Original description */}
          <div className="card p-4">
            <p className="text-[10px] text-fg-3 uppercase tracking-wide mb-2">Your Message</p>
            <p className="text-sm text-fg whitespace-pre-wrap">{selected.description}</p>
          </div>

          {/* Replies */}
          {(selected.replies || []).length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] text-fg-3 uppercase tracking-wide px-1">Conversation</p>
              {selected.replies.map((r, i) => {
                const isTeam = r.userId?.role !== 'client'
                return (
                  <div key={i} className={`card p-4 ${isTeam ? 'border-accent/30' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar name={r.userId?.name || '?'} size="xs" />
                      <span className="text-xs font-semibold text-fg">{isTeam ? 'ZRC Media Support' : 'You'}</span>
                      <span className="text-[10px] text-fg-3 ml-auto">{formatDate(r.createdAt)}</span>
                    </div>
                    <p className="text-sm text-fg-2 whitespace-pre-wrap">{r.message}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Reply */}
          {selected.status !== 'resolved' ? (
            <div className="card p-3 space-y-2">
              <p className="text-[10px] text-fg-3 uppercase tracking-wide">Add Reply</p>
              <textarea
                className="input w-full resize-none text-sm"
                rows={3}
                placeholder="Write your message…"
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply() }}
              />
              <div className="flex justify-end">
                <button className="btn btn-primary btn-sm gap-1" onClick={submitReply} disabled={sendingReply || !reply.trim()}>
                  <Send size={13} /> {sendingReply ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-4 text-center">
              <p className="text-sm text-fg-3">This ticket has been resolved. <button className="text-accent hover:underline" onClick={() => setCreateOpen(true)}>Open a new ticket</button> if you have another issue.</p>
            </div>
          )}

          {/* Create modal (for resolved ticket CTA) */}
          <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Raise a Support Ticket" size="sm" footer={
            <><button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitCreate} disabled={saving}>{saving ? 'Raising…' : 'Raise Ticket'}</button></>
          }>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-fg-2 mb-1">Title *</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Invoice not received" /></div>
              <div><label className="block text-xs font-medium text-fg-2 mb-1">Description *</label>
              <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your issue in detail…" /></div>
              <div><label className="block text-xs font-medium text-fg-2 mb-1">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select></div>
            </div>
          </Modal>
        </div>
      )
    }

    // List view
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-fg">Support</h1>
            <p className="text-sm text-fg-3 mt-0.5">Raise issues and track your support tickets</p>
          </div>
          <button className="btn btn-primary btn-sm gap-1" onClick={() => { setForm({ ...EMPTY_FORM }); setCreateOpen(true) }}>
            <Plus size={15} /> Raise a Ticket
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="card p-12 text-center space-y-3">
            <LifeBuoy size={32} className="mx-auto text-fg-3" />
            <p className="text-sm text-fg-3">No support tickets yet.</p>
            <button className="btn btn-primary btn-sm gap-1 mx-auto" onClick={() => { setForm({ ...EMPTY_FORM }); setCreateOpen(true) }}>
              <Plus size={14} /> Raise your first ticket
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t._id} className="card p-4 cursor-pointer hover:border-accent/40 transition-colors flex items-center gap-3"
                onClick={() => openDetail(t)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-fg-3">{t.ticketId}</span>
                    <span className={`badge text-[10px] ${STATUS_COLOUR[t.status]}`}>{t.status.replace(/_/g,' ')}</span>
                    <span className={`badge text-[10px] ${PRIORITY_COLOUR[t.priority]} capitalize`}>{t.priority}</span>
                  </div>
                  <p className="text-sm font-medium text-fg truncate">{t.title}</p>
                  <p className="text-xs text-fg-3 mt-0.5">Raised {formatDate(t.createdAt)} · {t.replies?.length || 0} repl{(t.replies?.length || 0) === 1 ? 'y' : 'ies'}</p>
                </div>
                <ChevronRight size={16} className="text-fg-3 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Create Ticket Modal */}
        <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Raise a Support Ticket" size="sm" footer={
          <><button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={submitCreate} disabled={saving}>{saving ? 'Raising…' : 'Raise Ticket'}</button></>
        }>
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Invoice not received" /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Description *</label>
            <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your issue in detail…" /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Priority</label>
            <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select></div>
          </div>
        </Modal>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd /Users/archismandutta/IH/ZRCCRM/zrcnewcrm
  git add client/src/pages/portal/PortalTickets.jsx
  git commit -m "feat: create portal Tickets page for clients"
  ```

---

## Task 6: Wire up routes and navigation

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/layout/Sidebar.jsx`
- Modify: `client/src/components/layout/ClientLayout.jsx`

- [ ] **Step 1: Add Tickets import and route to App.jsx**

  In `App.jsx`, add import after the `SalaryPage` import:
  ```js
  import TicketsPage   from '@/pages/Tickets'
  import PortalTickets from '@/pages/portal/PortalTickets'
  ```

  In the portal routes block, after `<Route path="invoices" element={<PortalInvoices />} />`:
  ```jsx
  <Route path="tickets" element={<PortalTickets />} />
  ```

  In the internal routes block, after the `reports` route:
  ```jsx
  {isAdmin && <Route path="tickets" element={<TicketsPage />} />}
  ```

- [ ] **Step 2: Add Tickets link to internal Sidebar**

  In `client/src/components/layout/Sidebar.jsx`, add `Headphones` to the lucide-react import (or `LifeBuoy` — use whichever icon is already imported, or add):

  Find the lucide-react import line and add `LifeBuoy`:
  ```js
  import {
    LayoutDashboard, Users, Briefcase, Calendar, CheckSquare,
    DollarSign, MessageSquare, BarChart3, Settings, LogOut,
    ChevronLeft, ChevronRight, Building2, Zap, Globe, Menu, Wallet, LifeBuoy
  } from 'lucide-react'
  ```

  In `buildNavSections`, inside the `Business` section items array, after the Salary entry:
  ```js
  ...(can(role, ADMIN_ROLES) ? [{ to: '/tickets', icon: LifeBuoy, label: 'Tickets' }] : []),
  ```

  Full updated Business section items:
  ```js
  {
    label: 'Business',
    items: [
      ...(role === 'super_admin'  ? [{ to: '/finance',  icon: DollarSign,   label: 'Finance' }]  : []),
      ...(role === 'super_admin'  ? [{ to: '/salary',   icon: Wallet,        label: 'Salary' }]   : []),
      ...(can(role, ADMIN_ROLES)  ? [{ to: '/tickets',  icon: LifeBuoy,      label: 'Tickets' }]  : []),
      { to: '/messages', icon: MessageSquare, label: 'Messages' },
      ...(can(role, REPORT_ROLES) ? [{ to: '/reports',  icon: BarChart3,     label: 'Reports' }]  : []),
    ],
  },
  ```

- [ ] **Step 3: Add Support link to ClientLayout portal nav**

  In `client/src/components/layout/ClientLayout.jsx`, add `LifeBuoy` to the lucide import:
  ```js
  import { LayoutDashboard, Briefcase, Calendar, FileText, LogOut, Menu, X, Sun, Moon, LifeBuoy } from 'lucide-react'
  ```

  Update the `NAV` array:
  ```js
  const NAV = [
    { to: '/portal/overview',  icon: LayoutDashboard, label: 'Overview' },
    { to: '/portal/projects',  icon: Briefcase,       label: 'My Projects' },
    { to: '/portal/content',   icon: Calendar,        label: 'Content' },
    { to: '/portal/invoices',  icon: FileText,        label: 'Invoices' },
    { to: '/portal/tickets',   icon: LifeBuoy,        label: 'Support' },
  ]
  ```

- [ ] **Step 4: Commit**

  ```bash
  cd /Users/archismandutta/IH/ZRCCRM/zrcnewcrm
  git add client/src/App.jsx client/src/components/layout/Sidebar.jsx client/src/components/layout/ClientLayout.jsx
  git commit -m "feat: wire up Tickets routes and nav links for internal and portal users"
  ```

---

## Task 7: Smoke-test all new features

- [ ] **Step 1: Start both servers**

  ```bash
  # Terminal 1 — backend
  cd /Users/archismandutta/IH/ZRCCRM/zrcnewcrm/server && node server.js

  # Terminal 2 — frontend
  cd /Users/archismandutta/IH/ZRCCRM/zrcnewcrm/client && npm run dev
  ```

- [ ] **Step 2: Test Finance Expenses tab**

  1. Log in as `super_admin`
  2. Go to Finance → Expenses tab
  3. Click "Add Expense" → fill in all fields → confirm expense appears in table
  4. Change month/year filter → table updates
  5. Delete an expense → row disappears

- [ ] **Step 3: Test Finance P&L tab**

  1. Go to Finance → P&L tab
  2. Toggle between 3 / 6 / 12 months
  3. Summary cards show numbers (may be zero with no data — that is correct)
  4. Line chart renders without errors

- [ ] **Step 4: Test internal Tickets page**

  1. Go to `/tickets` — table loads (may be empty)
  2. Click "New Ticket" → select client, fill title/description → create → ticket appears in list
  3. Click the ticket row → detail modal opens
  4. Change status → status badge updates
  5. Type a reply → hit Send → reply appears in thread

- [ ] **Step 5: Test portal Tickets page**

  1. Log in as a client-role user → redirected to `/portal/overview`
  2. Click "Support" in sidebar → `/portal/tickets` loads
  3. Click "Raise a Ticket" → fill form → ticket created
  4. Click ticket in list → thread view loads
  5. Add a reply → appears in conversation

- [ ] **Step 6: Final commit**

  All features verified — no additional commits needed unless a bug was found and fixed.
