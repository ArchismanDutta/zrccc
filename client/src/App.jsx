import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ToastProvider } from '@/components/ui/Toast'
import { AppLayout } from '@/components/layout/AppLayout'
import { ClientLayout } from '@/components/layout/ClientLayout'
import LoginPage          from '@/pages/Login'
import ForgotPasswordPage from '@/pages/ForgotPassword'
import ResetPasswordPage  from '@/pages/ResetPassword'
import DashboardPage from '@/pages/Dashboard'
import ClientsPage      from '@/pages/Clients'
import ClientDetailPage from '@/pages/ClientDetail'
import ProjectsPage     from '@/pages/Projects'
import ProjectDetailPage from '@/pages/ProjectDetail'
import ContentPage   from '@/pages/Content'
import TasksPage     from '@/pages/Tasks'
import FinancePage   from '@/pages/Finance'
import MessagesPage  from '@/pages/Messages'
import ReportsPage   from '@/pages/Reports'
import SettingsPage  from '@/pages/Settings'
import SalaryPage    from '@/pages/Salary'
import TicketsPage   from '@/pages/Tickets'
import PortalOverview    from '@/pages/portal/Overview'
import PortalProjects    from '@/pages/portal/PortalProjects'
import PortalContent     from '@/pages/portal/PortalContent'
import PortalInvoices    from '@/pages/portal/PortalInvoices'
import PortalTickets from '@/pages/portal/PortalTickets'

function ProtectedRoutes() {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )

  if (!isAuthenticated) {
    const path = window.location.pathname
    if (path === '/forgot-password') return <ForgotPasswordPage />
    if (path === '/reset-password')  return <ResetPasswordPage />
    return <LoginPage />
  }

  // Client role → restricted portal
  if (user?.role === 'client') {
    return (
      <Routes>
        <Route path="/portal" element={<ClientLayout />}>
          <Route index element={<Navigate to="/portal/overview" replace />} />
          <Route path="overview"  element={<PortalOverview />} />
          <Route path="projects"  element={<PortalProjects />} />
          <Route path="content"   element={<PortalContent />} />
          <Route path="invoices"  element={<PortalInvoices />} />
          <Route path="tickets"  element={<PortalTickets />} />
        </Route>
        <Route path="*" element={<Navigate to="/portal/overview" replace />} />
      </Routes>
    )
  }

  const r = user?.role
  const isAdmin    = ['super_admin','admin'].includes(r)
  const isManager  = ['super_admin','admin','account_manager','project_manager'].includes(r)
  const isFinance  = ['super_admin','admin'].includes(r)
  const isReporter = ['super_admin','admin','project_manager','account_manager'].includes(r)
  const canTickets = ['super_admin','admin','project_manager','account_manager'].includes(r)

  // All other roles → full admin CRM (filtered by role)
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        {isManager && <Route path="clients"     element={<ClientsPage />} />}
        {isManager && <Route path="clients/:id" element={<ClientDetailPage />} />}
        <Route path="projects"     element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="content"   element={<ContentPage />} />
        <Route path="tasks"     element={<TasksPage />} />
        {isFinance  && <Route path="finance"  element={<FinancePage />} />}
        <Route path="messages"  element={<MessagesPage />} />
        {isReporter && <Route path="reports"  element={<ReportsPage />} />}
        {r === 'super_admin' && <Route path="salary" element={<SalaryPage />} />}
        {canTickets && <Route path="tickets" element={<TicketsPage />} />}
        {isAdmin    && <Route path="settings" element={<SettingsPage />} />}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ProtectedRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
