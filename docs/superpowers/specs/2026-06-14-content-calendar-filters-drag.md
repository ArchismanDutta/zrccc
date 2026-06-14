# Content Calendar: Filters + Drag-to-Reschedule Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cascading client/project filters and HTML5 drag-to-reschedule to the content calendar.

**Architecture:** All changes are frontend-only in `client/src/pages/Content.jsx`. The backend already supports `?clientId=` and `?projectId=` query params on `GET /content`. No new dependencies.

**Tech Stack:** React 19, HTML5 Drag and Drop API, existing `api.updateContent()`

---

## Feature 1: Cascading Client → Project Filter

### Behaviour
- Two dropdowns rendered above the calendar month navigation row
- "All Clients" dropdown: lists all clients from the already-fetched `clients` state
- "All Projects" dropdown: shows only projects whose `clientId._id` matches the selected client (or all projects when no client selected)
- Selecting a client resets the project filter to `''`
- The `fetchContent` call appends `&clientId=X` and/or `&projectId=Y` when filters are active
- Filters re-trigger `fetchContent` via `useEffect` alongside `[year, month]`

### State
```js
const [clientFilter, setClientFilter] = useState('')   // client _id or ''
const [projectFilter, setProjectFilter] = useState('') // project _id or ''
```

### Filtered project list for dropdown
```js
const filteredProjects = clientFilter
  ? projects.filter(p => (p.clientId?._id || p.clientId) === clientFilter)
  : projects
```

### fetchContent query string
```js
const params = new URLSearchParams({ plannedMonth, limit: 200 })
if (clientFilter)  params.set('clientId', clientFilter)
if (projectFilter) params.set('projectId', projectFilter)
api.getContent(`?${params}`)
```

### useEffect dependency update
```js
useEffect(() => { fetchContent() }, [year, month, clientFilter, projectFilter])
```

### loadFormDeps fix
Switch from `Promise.all` to `Promise.allSettled` so a 403 on `getUsers` does not silently prevent clients/projects from loading (same bug already fixed in Tasks.jsx and Projects.jsx).

---

## Feature 2: Drag to Reschedule

### Behaviour
- Each content card rendered inside a calendar day is `draggable`
- Day cells are drop targets
- Dragging a card: card renders at 40% opacity (`opacity-40`)
- Hovering a day cell with a card: cell gets `ring-2 ring-accent/60` highlight
- Dropping onto a new day: calls `api.updateContent(itemId, { scheduledAt: newDateISO })` then updates local state optimistically
- If the API call fails: revert the item to its original date and show `toast.error`
- Cross-month drag: not possible — calendar only shows the current month's cells

### State
```js
const [draggingId, setDraggingId] = useState(null)   // _id of card being dragged
const [dragOverDay, setDragOverDay] = useState(null)  // day number being hovered
```

### Card drag handlers
```js
draggable
onDragStart={() => setDraggingId(item._id)}
onDragEnd={() => { setDraggingId(null); setDragOverDay(null) }}
// wrapper div gets: className={draggingId === item._id ? 'opacity-40' : ''}
```

### Day cell drop handlers
```js
onDragOver={e => { e.preventDefault(); setDragOverDay(dayNum) }}
onDragLeave={() => setDragOverDay(null)}
onDrop={e => { e.preventDefault(); handleDrop(dayNum); setDragOverDay(null) }}
// cell gets ring when: dragOverDay === dayNum && draggingId !== null
```

### handleDrop function
```js
const handleDrop = async (dayNum) => {
  if (!draggingId) return
  const item = items.find(i => i._id === draggingId)
  if (!item) return

  const newDate = new Date(year, month, dayNum)
  const newISO  = newDate.toISOString()
  const oldISO  = item.scheduledAt

  // Optimistic update
  setItems(prev => prev.map(i => i._id === draggingId ? { ...i, scheduledAt: newISO } : i))
  setDraggingId(null)

  try {
    await api.updateContent(draggingId, { scheduledAt: newISO })
  } catch {
    // Revert
    setItems(prev => prev.map(i => i._id === draggingId ? { ...i, scheduledAt: oldISO } : i))
    toast.error('Failed to reschedule — changes reverted')
  }
}
```

---

## What Does NOT Change
- Calendar grid rendering logic
- Month navigation
- Content modal (create / edit)
- Backend — no changes required
- All other pages

---

## Files Modified
- `client/src/pages/Content.jsx` — only file touched
