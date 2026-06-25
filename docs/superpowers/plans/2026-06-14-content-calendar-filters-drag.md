# Content Calendar: Filters + Drag-to-Reschedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cascading client/project filters and HTML5 drag-to-reschedule to the content calendar page.

**Architecture:** All changes are in one file — `client/src/pages/Content.jsx`. No backend changes. No new dependencies. Filter state drives the `fetchContent` API call. Drag uses the browser's native HTML5 drag API with optimistic state updates.

**Tech Stack:** React 19, HTML5 Drag and Drop API, existing `api.updateContent()` and `api.getContent()`

---

## File Structure

- Modify: `client/src/pages/Content.jsx` — only file touched

---

### Task 1: Fix loadFormDeps + add filter state + update fetchContent

**Files:**
- Modify: `client/src/pages/Content.jsx`

**Context:**
The current `loadFormDeps` uses `Promise.all` — if `api.getUsers()` returns 403 (non-admin users don't have `users:read:all`), the whole load silently fails and clients/projects never populate. Fix this to `Promise.allSettled` first. Then add two filter state variables and update `fetchContent` to append them to the query string. Also add `clientFilter` and `projectFilter` to the `useEffect` dependency array so the calendar refetches when filters change.

**Current code (lines 255–261):**
```jsx
const loadFormDeps = async () => {
  if (projects.length && clients.length && users.length) return
  try {
    const [p, c, u] = await Promise.all([api.getProjects('?limit=100'), api.getClients('?limit=100'), api.getUsers('?limit=100')])
    setProjects(p.data); setClients(c.data); setUsers(u.data)
  } catch {}
}
```

**Current fetchContent (lines 246–251):**
```jsx
const fetchContent = async () => {
  setLoading(true)
  try { const res = await api.getContent(`?plannedMonth=${plannedMonth}&limit=200`); setItems(res.data) }
  catch { toast.error('Failed to load content') }
  finally { setLoading(false) }
}

useEffect(() => { fetchContent() }, [year, month])
```

- [ ] **Step 1: Add filter state variables after the existing `overflowDay` state (line 242)**

Find this block:
```jsx
// Day overflow popover
const [overflowDay, setOverflowDay] = useState(null)
```

Replace with:
```jsx
// Day overflow popover
const [overflowDay, setOverflowDay] = useState(null)

// Filters
const [clientFilter, setClientFilter]   = useState('')
const [projectFilter, setProjectFilter] = useState('')
```

- [ ] **Step 2: Update fetchContent to use filter params**

Find:
```jsx
const fetchContent = async () => {
  setLoading(true)
  try { const res = await api.getContent(`?plannedMonth=${plannedMonth}&limit=200`); setItems(res.data) }
  catch { toast.error('Failed to load content') }
  finally { setLoading(false) }
}
```

Replace with:
```jsx
const fetchContent = async () => {
  setLoading(true)
  try {
    const params = new URLSearchParams({ plannedMonth, limit: 200 })
    if (clientFilter)  params.set('clientId', clientFilter)
    if (projectFilter) params.set('projectId', projectFilter)
    const res = await api.getContent(`?${params}`)
    setItems(res.data)
  } catch { toast.error('Failed to load content') }
  finally { setLoading(false) }
}
```

- [ ] **Step 3: Update useEffect to re-fetch when filters change**

Find:
```jsx
useEffect(() => { fetchContent() }, [year, month])
```

Replace with:
```jsx
useEffect(() => { fetchContent() }, [year, month, clientFilter, projectFilter])
```

- [ ] **Step 4: Fix loadFormDeps to use Promise.allSettled**

Find:
```jsx
const loadFormDeps = async () => {
  if (projects.length && clients.length && users.length) return
  try {
    const [p, c, u] = await Promise.all([api.getProjects('?limit=100'), api.getClients('?limit=100'), api.getUsers('?limit=100')])
    setProjects(p.data); setClients(c.data); setUsers(u.data)
  } catch {}
}
```

Replace with:
```jsx
const loadFormDeps = async () => {
  if (projects.length && clients.length) return
  const [pRes, cRes, uRes] = await Promise.allSettled([
    api.getProjects('?limit=100'),
    api.getClients('?limit=100'),
    api.getUsers('?limit=100'),
  ])
  if (pRes.status === 'fulfilled') setProjects(pRes.value.data || [])
  if (cRes.status === 'fulfilled') setClients(cRes.value.data || [])
  if (uRes.status === 'fulfilled') setUsers(uRes.value.data || [])
}
```

- [ ] **Step 5: Verify the app still loads — open the Content Calendar page and confirm it shows content for the current month with no console errors**

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Content.jsx
git commit -m "fix: add filter state, update fetchContent params, fix loadFormDeps to Promise.allSettled"
```

---

### Task 2: Add filter dropdowns UI above the month navigator

**Files:**
- Modify: `client/src/pages/Content.jsx`

**Context:**
The month nav bar is rendered inside `.card` starting at line 410. Add the two filter dropdowns in a row directly above that `.card`. The project dropdown shows only projects whose `clientId` matches the selected client filter. Selecting a client resets the project filter to `''`.

- [ ] **Step 1: Add the filteredProjects computed variable**

Find (just before the `return (` around line 392):
```jsx
const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
const MAX_SHOW = isMobile ? 1 : 2
```

Add after those two lines:
```jsx
const filteredProjects = clientFilter
  ? projects.filter(p => String(p.clientId?._id || p.clientId) === clientFilter)
  : projects
```

- [ ] **Step 2: Add the filter bar in the JSX — place it between the legend and the calendar card**

Find:
```jsx
      {/* Calendar */}
      <div className="card overflow-hidden">
```

Replace with:
```jsx
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          className="input sm:w-48 text-sm"
          value={clientFilter}
          onChange={e => { setClientFilter(e.target.value); setProjectFilter('') }}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
        </select>
        <select
          className="input sm:w-48 text-sm"
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}>
          <option value="">All Projects</option>
          {filteredProjects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        {(clientFilter || projectFilter) && (
          <button
            className="btn btn-ghost text-xs text-fg-3"
            onClick={() => { setClientFilter(''); setProjectFilter('') }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Calendar */}
      <div className="card overflow-hidden">
```

- [ ] **Step 3: Verify in the browser**

1. Open the Content Calendar page
2. The two dropdowns appear above the calendar
3. Select a client — the project dropdown narrows to that client's projects
4. Select a project — the calendar refetches and shows only that project's content
5. Click "Clear filters" — both dropdowns reset and all content returns
6. Console shows no errors

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Content.jsx
git commit -m "feat: add cascading client/project filter dropdowns to content calendar"
```

---

### Task 3: Add drag state and handleDrop logic

**Files:**
- Modify: `client/src/pages/Content.jsx`

**Context:**
Add two pieces of state: `draggingId` (which content item is being dragged) and `dragOverDay` (which day number the user is hovering over). Then add `handleDrop` which updates `scheduledAt` optimistically and reverts on API failure.

- [ ] **Step 1: Add drag state after the filter state variables**

Find:
```jsx
// Filters
const [clientFilter, setClientFilter]   = useState('')
const [projectFilter, setProjectFilter] = useState('')
```

Add after:
```jsx
// Drag to reschedule
const [draggingId, setDraggingId]   = useState(null)
const [dragOverDay, setDragOverDay] = useState(null)
```

- [ ] **Step 2: Add handleDrop function**

Place this immediately after the `handleReject` function (around line 349, just before the `daysInMonth` calculation):

```jsx
const handleDrop = async (dayNum) => {
  if (!draggingId) return
  const item = items.find(i => i._id === draggingId)
  if (!item) return

  const newDate = new Date(year, month, dayNum)
  const newISO  = newDate.toISOString()
  const oldISO  = item.scheduledAt

  // Skip if dropped on same day
  if (oldISO) {
    const oldDay = new Date(oldISO).getDate()
    if (oldDay === dayNum) { setDraggingId(null); return }
  }

  // Optimistic update
  setItems(prev => prev.map(i => i._id === draggingId ? { ...i, scheduledAt: newISO } : i))
  setDraggingId(null)

  try {
    await api.updateContent(item._id, { scheduledAt: newISO })
  } catch {
    // Revert on failure
    setItems(prev => prev.map(i => i._id === item._id ? { ...i, scheduledAt: oldISO } : i))
    toast.error('Failed to reschedule — changes reverted')
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Content.jsx
git commit -m "feat: add drag state and handleDrop for content rescheduling"
```

---

### Task 4: Wire drag into day cells and content cards

**Files:**
- Modify: `client/src/pages/Content.jsx`

**Context:**
Each content card (the `<button>` inside visible items) needs `draggable` + `onDragStart` + `onDragEnd`. Each day cell `<div>` needs `onDragOver` + `onDragLeave` + `onDrop`. The dragging card gets `opacity-40`. The hovered day cell gets a `ring-2 ring-accent/50` highlight when a drag is in progress.

- [ ] **Step 1: Update each content card button to be draggable**

Find the content card button inside the day cell (around line 462):
```jsx
                        <button key={item._id}
                          onClick={e => { e.stopPropagation(); openEdit(item) }}
                          className="w-full flex items-center gap-0.5 px-1 sm:px-1.5 py-px sm:py-0.5 rounded-md text-[8px] sm:text-[10px] font-medium truncate text-left hover:opacity-80 transition-opacity"
                          style={{ background: `${colour}18`, color: colour, border: `1px solid ${colour}30` }}>
                          <span className="truncate">{item.title}</span>
                        </button>
```

Replace with:
```jsx
                        <button key={item._id}
                          draggable
                          onDragStart={e => { e.stopPropagation(); setDraggingId(item._id) }}
                          onDragEnd={e => { e.stopPropagation(); setDraggingId(null); setDragOverDay(null) }}
                          onClick={e => { e.stopPropagation(); openEdit(item) }}
                          className={`w-full flex items-center gap-0.5 px-1 sm:px-1.5 py-px sm:py-0.5 rounded-md text-[8px] sm:text-[10px] font-medium truncate text-left hover:opacity-80 transition-opacity ${draggingId === item._id ? 'opacity-40' : ''}`}
                          style={{ background: `${colour}18`, color: colour, border: `1px solid ${colour}30` }}>
                          <span className="truncate">{item.title}</span>
                        </button>
```

- [ ] **Step 2: Update each day cell div to be a drop target**

Find the day cell opening div (around line 448):
```jsx
              return (
                <div key={day}
                  onClick={() => openCreate(dateStr)}
                  className={`group relative min-h-[52px] sm:min-h-[88px] lg:min-h-[108px] border-r border-b border-[var(--color-border)] p-0.5 sm:p-1.5 cursor-pointer transition-colors hover:bg-accent/5 ${isWeekend ? 'bg-[var(--color-surface-2)] hover:bg-accent/5' : ''}`}>
```

Replace with:
```jsx
              return (
                <div key={day}
                  onClick={() => { if (!draggingId) openCreate(dateStr) }}
                  onDragOver={e => { e.preventDefault(); setDragOverDay(day) }}
                  onDragLeave={() => setDragOverDay(null)}
                  onDrop={e => { e.preventDefault(); handleDrop(day) }}
                  className={`group relative min-h-[52px] sm:min-h-[88px] lg:min-h-[108px] border-r border-b border-[var(--color-border)] p-0.5 sm:p-1.5 cursor-pointer transition-colors hover:bg-accent/5 ${isWeekend ? 'bg-[var(--color-surface-2)] hover:bg-accent/5' : ''} ${draggingId && dragOverDay === day ? 'ring-2 ring-inset ring-accent/50 bg-accent/5' : ''}`}>
```

- [ ] **Step 3: Verify drag-to-reschedule works end-to-end in the browser**

1. Open Content Calendar with some content items visible
2. Drag a content card — it goes 40% opacity while dragging
3. Hover a different day — that day cell gets a blue ring highlight
4. Drop the card — it moves to the new day immediately (optimistic update)
5. Refresh the page — the content stays on the new day (server was updated)
6. Test error case: temporarily break the API (wrong endpoint in browser devtools network tab → block the request) — card should snap back and show "Failed to reschedule — changes reverted"
7. Verify clicking a day cell still opens the create modal when not dragging

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Content.jsx
git commit -m "feat: wire HTML5 drag-to-reschedule on content calendar cards and day cells"
```
