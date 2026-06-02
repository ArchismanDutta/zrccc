import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

export default function PortalInvoices() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getInvoices('?limit=100')
      .then(r => setInvoices(r.data || []))
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [])

  const downloadPdf = async (inv) => {
    try {
      const res = await api.downloadInvoicePdf(inv._id)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${inv.invoiceNumber || inv.invoiceId || 'invoice'}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { toast.error(err.message) }
  }

  const totalBilled = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0)
  const totalPaid = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0)
  const totalDue = totalBilled - totalPaid

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-fg">Invoices</h1>
        <p className="text-sm text-fg-3 mt-1">Your billing history and payment status</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Billed', value: formatCurrency(totalBilled), colour: 'var(--color-fg)' },
          { label: 'Paid', value: formatCurrency(totalPaid), colour: 'var(--color-success)' },
          { label: 'Outstanding', value: formatCurrency(totalDue), colour: totalDue > 0 ? 'var(--color-danger)' : 'var(--color-fg-3)' },
        ].map(c => (
          <div key={c.label} className="card p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-fg-3 mb-1">{c.label}</p>
            <p className="text-sm sm:text-base font-bold" style={{ color: c.colour }}>{c.value}</p>
          </div>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="card p-12 text-center text-fg-3 text-sm">No invoices yet.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-fg-3 uppercase tracking-wide">Invoice</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-fg-3 uppercase tracking-wide hidden sm:table-cell">Amount</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-fg-3 uppercase tracking-wide hidden sm:table-cell">Paid</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-fg-3 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv._id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-xs text-fg">{inv.invoiceNumber || inv.invoiceId}</p>
                    <p className="text-[10px] text-fg-3 mt-0.5">Due {formatDate(inv.dueDate)}</p>
                    <p className="text-xs font-bold sm:hidden mt-0.5">{formatCurrency(inv.totalAmount)}</p>
                  </td>
                  <td className="px-3 py-3 text-right hidden sm:table-cell">
                    <p className="font-semibold text-fg">{formatCurrency(inv.totalAmount)}</p>
                  </td>
                  <td className="px-3 py-3 text-right hidden sm:table-cell">
                    <p className="font-semibold text-[var(--color-success)]">{formatCurrency(inv.paidAmount)}</p>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => downloadPdf(inv)} className="btn btn-ghost btn-sm text-[10px] gap-1" title="Download PDF">
                      <Download size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
