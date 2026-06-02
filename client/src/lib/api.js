const API_BASE = 'http://localhost:5001/api'

class ApiClient {
  constructor() { this.token = localStorage.getItem('zrc_token') || null }

  setToken(t) { this.token = t; t ? localStorage.setItem('zrc_token', t) : localStorage.removeItem('zrc_token') }
  getToken() { return this.token || localStorage.getItem('zrc_token') }

  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers }
    const token = this.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
    const data = await res.json()
    if (!res.ok) { const err = new Error(data?.error?.message || 'Request failed'); err.status = res.status; throw err }
    return data
  }

  get(e) { return this.request(e) }
  post(e, b) { return this.request(e, { method: 'POST', body: JSON.stringify(b) }) }
  patch(e, b) { return this.request(e, { method: 'PATCH', body: JSON.stringify(b) }) }
  del(e) { return this.request(e, { method: 'DELETE' }) }

  // Auth
  login(email, password) { return this.post('/auth/login', { email, password }) }
  getMe() { return this.get('/auth/me') }

  // Clients
  getClients(q = '') { return this.get(`/clients${q}`) }
  getClient(id) { return this.get(`/clients/${id}`) }
  createClient(d) { return this.post('/clients', d) }
  updateClient(id, d) { return this.patch(`/clients/${id}`, d) }
  changeClientStatus(id, d) { return this.patch(`/clients/${id}/status`, d) }
  deleteClient(id) { return this.del(`/clients/${id}`) }

  // Projects
  getProjects(q = '') { return this.get(`/projects${q}`) }
  getProject(id) { return this.get(`/projects/${id}`) }
  createProject(d) { return this.post('/projects', d) }
  updateProject(id, d) { return this.patch(`/projects/${id}`, d) }
  changeProjectStatus(id, d) { return this.patch(`/projects/${id}/status`, d) }
  addTeamMember(id, d) { return this.post(`/projects/${id}/team`, d) }
  removeTeamMember(id, userId) { return this.del(`/projects/${id}/team/${userId}`) }
  addMilestone(id, d) { return this.post(`/projects/${id}/milestones`, d) }
  toggleMilestone(id, milestoneId) { return this.patch(`/projects/${id}/milestones/${milestoneId}`, {}) }

  // Tasks
  getTasks(q = '') { return this.get(`/tasks${q}`) }
  getTask(id) { return this.get(`/tasks/${id}`) }
  createTask(d) { return this.post('/tasks', d) }
  updateTask(id, d) { return this.patch(`/tasks/${id}`, d) }
  changeTaskStatus(id, d) { return this.patch(`/tasks/${id}/status`, d) }

  // Content
  getContent(q = '') { return this.get(`/content${q}`) }
  getContentItem(id) { return this.get(`/content/${id}`) }
  createContent(d) { return this.post('/content', d) }
  updateContent(id, d) { return this.patch(`/content/${id}`, d) }
  changeContentStatus(id, d) { return this.patch(`/content/${id}/status`, d) }
  approveContent(id, d) { return this.post(`/content/${id}/approve`, d) }
  rejectContent(id, d) { return this.post(`/content/${id}/reject`, d) }

  // Finance
  getFinanceDashboard() { return this.get('/finance/dashboard') }
  getInvoices(q = '') { return this.get(`/finance/invoices${q}`) }
  createInvoice(d) { return this.post('/finance/invoices', d) }
  sendInvoice(id) { return this.post(`/finance/invoices/${id}/send`) }
  downloadInvoicePdf(id) {
    const token = this.getToken()
    return fetch(`${API_BASE}/finance/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
  }
  getClientPayments() { return this.get('/finance/client-payments') }
  logPayment(d) { return this.post('/finance/payments', d) }

  // HR / Salary
  getHrEmployees(q = '') { return this.get(`/hr/employees${q}`) }
  updateEmployeeSalary(id, d) { return this.patch(`/hr/employees/${id}/salary`, d) }
  createSalaryRecord(d) { return this.post('/hr/salaries', d) }
  getSalaryRecords(q = '') { return this.get(`/hr/salaries${q}`) }
  markSalaryPaid(id, d) { return this.patch(`/hr/salaries/${id}/pay`, d) }
  updateDeductions(id, d) { return this.patch(`/hr/salaries/${id}/deductions`, d) }
  getMySalaryRecords() { return this.get('/hr/salaries/mine') }
  downloadPayslip(id) {
    const token = this.getToken()
    return fetch(`${API_BASE}/hr/salaries/${id}/payslip`, { headers: { Authorization: `Bearer ${token}` } })
  }

  // Users
  getUsers(q = '') { return this.get(`/users${q}`) }
  createUser(d) { return this.post('/users', d) }
  updateUser(id, d) { return this.patch(`/users/${id}`, d) }
  deactivateUser(id) { return this.post(`/users/${id}/deactivate`) }

  // Departments
  getDepartments() { return this.get('/departments') }

  // Stats
  getDashboard() { return this.get('/stats/dashboard') }
  getRevenueChart(m = 6) { return this.get(`/stats/revenue?months=${m}`) }

  // Notifications
  getNotifications() { return this.get('/notifications') }
  markAllRead() { return this.post('/notifications/mark-all-read') }

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
}

export const api = new ApiClient()
export default api
