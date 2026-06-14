import { useState, useEffect } from 'react'
import { Download, Wallet } from 'lucide-react'
import { PageHeader, SectionCard } from '@/components/ui/Cards'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_VARIANT = { paid: 'success', pending: 'warning', failed: 'danger' }

function fmt(n) {
  return typeof n === 'number' ? `Rs. ${n.toLocaleString('en-IN')}` : '—'
}

export default function MyPayslipsPage() {
  const { toast } = useToast()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    api.getMySalaryRecords()
      .then(res => setRecords(res.data || []))
      .catch(err => toast.error(err.message || 'Failed to load payslips'))
      .finally(() => setLoading(false))
  }, [])

  const handleDownload = async (record) => {
    setDownloading(record._id)
    try {
      await api.downloadPayslip(record._id)
    } catch (err) {
      toast.error(err.message || 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const totalPaid = records.filter(r => r.status === 'paid').reduce((s, r) => s + (r.netSalary || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <PageHeader
        title="My Payslips"
        subtitle="Your salary history and payslip downloads"
        icon={<Wallet size={20} />}
      />

      {records.length === 0 ? (
        <SectionCard>
          <p className="text-sm text-fg-3 text-center py-12">No salary records found</p>
        </SectionCard>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-fg-3 mb-1">Total Records</p>
              <p className="text-2xl font-bold text-fg">{records.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-fg-3 mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-fg">{fmt(totalPaid)}</p>
            </div>
            <div className="card p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-fg-3 mb-1">Latest Status</p>
              {records[0] && (
                <Badge variant={STATUS_VARIANT[records[0].status] || 'neutral'} className="text-sm capitalize mt-1">
                  {records[0].status}
                </Badge>
              )}
            </div>
          </div>

          {/* Records table */}
          <SectionCard title="Salary History">
            <div className="divide-y divide-[var(--color-border)]">
              {records.map(record => {
                const deductionTotal = (record.deductions || []).reduce((s, d) => s + (d.amount || 0), 0)
                return (
                  <div key={record._id} className="py-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent-ghost flex flex-col items-center justify-center">
                      <span className="text-[10px] font-semibold text-accent leading-none">{MONTHS[(record.month || 1) - 1]}</span>
                      <span className="text-xs text-accent font-bold">{record.year}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-fg">
                          {MONTHS[(record.month || 1) - 1]} {record.year}
                        </p>
                        <Badge variant={STATUS_VARIANT[record.status] || 'neutral'} className="text-[10px] capitalize">
                          {record.status}
                        </Badge>
                        {record.salaryId && (
                          <span className="text-[10px] text-fg-3">{record.salaryId}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        <span className="text-xs text-fg-3">Base: <span className="text-fg-2">{fmt(record.baseSalary)}</span></span>
                        {record.bonus > 0 && (
                          <span className="text-xs text-fg-3">Bonus: <span className="text-[var(--color-success)]">+{fmt(record.bonus)}</span></span>
                        )}
                        {deductionTotal > 0 && (
                          <span className="text-xs text-fg-3">Deductions: <span className="text-[var(--color-danger)]">-{fmt(deductionTotal)}</span></span>
                        )}
                        <span className="text-xs font-semibold text-fg">Net: {fmt(record.netSalary)}</span>
                      </div>
                      {record.paidDate && (
                        <p className="text-[11px] text-fg-3 mt-0.5">
                          Paid on {new Date(record.paidDate).toLocaleDateString()}
                          {record.paymentMethod && ` via ${record.paymentMethod.replace(/_/g, ' ')}`}
                        </p>
                      )}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm gap-1.5 flex-shrink-0"
                      onClick={() => handleDownload(record)}
                      disabled={downloading === record._id}
                      title="Download payslip PDF"
                    >
                      <Download size={14} className={downloading === record._id ? 'animate-bounce' : ''} />
                      <span className="hidden sm:inline">Payslip</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}
