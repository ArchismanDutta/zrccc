import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { MessageSquare, Send, Plus, Hash, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'

let socketInstance = null

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
    })
  }
  return socketInstance
}

// ─── Channel List ──────────────────────────────────────────────
function ChannelList({ channels, activeId, onSelect, onNewDm }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-fg">Messages</h2>
        <button onClick={onNewDm} className="btn btn-secondary text-xs gap-1 py-1 px-2">
          <Plus size={12} /> DM
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {channels.length === 0 && (
          <p className="text-xs text-fg-3 text-center py-8 px-4">No channels yet. Start a DM!</p>
        )}
        {channels.map(ch => (
          <button key={ch._id} onClick={() => onSelect(ch)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-surface-3)] transition-colors ${activeId === ch._id ? 'bg-accent-ghost text-accent' : 'text-fg'}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--color-surface-3)] flex-shrink-0">
              {ch.type === 'direct' ? <UserIcon size={13} /> : <Hash size={13} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ch.name || (ch.type === 'direct' ? 'Direct Message' : ch.type)}</p>
              {ch.lastMessage && (
                <p className="text-xs text-fg-3 truncate">{ch.lastMessage}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Message Thread ────────────────────────────────────────────
function MessageThread({ channel, messages, onSend, typingUsers, messagesEndRef, usersMapRef }) {
  const [input, setInput] = useState('')
  const { user } = useAuth()
  const socket = getSocket()
  const typingThrottleRef = useRef(null)

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }

  const handleTyping = () => {
    if (!channel || typingThrottleRef.current) return
    socket.emit('message:typing', { channelId: channel._id })
    typingThrottleRef.current = setTimeout(() => { typingThrottleRef.current = null }, 1000)
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-full text-fg-3">
        <div className="text-center">
          <MessageSquare size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a channel to start messaging</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-accent-ghost">
          {channel.type === 'direct' ? <UserIcon size={13} className="text-accent" /> : <Hash size={13} className="text-accent" />}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-fg">{channel.name || 'Direct Message'}</h3>
          {typingUsers.length > 0 && (
            <p className="text-xs text-fg-3 italic">{typingUsers.map(id => usersMapRef.current?.[id] || 'Someone').join(', ')} is typing…</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => {
          const isOwn = String(msg.senderId?._id || msg.senderId) === String(user?.id)
          const senderName = msg.senderId?.name || 'Unknown'
          const initial = senderName.charAt(0).toUpperCase()
          return (
            <div key={msg._id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
              {!isOwn && (
                <div className="w-7 h-7 rounded-full bg-accent-ghost flex items-center justify-center text-accent text-xs font-bold flex-shrink-0 mt-0.5">
                  {initial}
                </div>
              )}
              <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isOwn && <p className="text-[11px] text-fg-3 px-1">{senderName}</p>}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isOwn ? 'bg-accent text-white rounded-tr-sm' : 'bg-[var(--color-surface-3)] text-fg rounded-tl-sm'}`}>
                  {msg.body}
                </div>
                <p className="text-[10px] text-fg-3 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-[var(--color-border)] flex gap-2">
        <input
          className="input flex-1 text-sm"
          placeholder={`Message ${channel.name || 'this channel'}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={() => handleTyping()}
          autoFocus
        />
        <button type="submit" disabled={!input.trim()} className="btn btn-primary px-3 py-2">
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}

// ─── New DM Modal ─────────────────────────────────────────────
function NewDmModal({ onClose, onCreated }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getUsers('?limit=100')
      .then(r => setUsers(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))

  const handleSelect = async (userId) => {
    try {
      const res = await api.post('/messages/channels/direct', { userId })
      onCreated(res.data)
    } catch (_) {}
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="card w-full max-w-sm p-4 space-y-3">
        <h3 className="font-semibold text-fg">Start Direct Message</h3>
        <input className="input text-sm" placeholder="Search team members…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        <div className="max-h-60 overflow-y-auto space-y-1">
          {loading && <p className="text-sm text-fg-3 text-center py-4">Loading…</p>}
          {!loading && filtered.map(u => (
            <button key={u._id} onClick={() => handleSelect(u._id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-3)] text-left">
              <div className="w-7 h-7 rounded-full bg-accent-ghost flex items-center justify-center text-accent text-xs font-bold">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-fg">{u.name}</p>
                <p className="text-xs text-fg-3">{u.role?.replace(/_/g, ' ')}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="btn btn-secondary w-full text-sm">Cancel</button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────
export default function MessagesPage() {
  const { user } = useAuth()
  const [channels, setChannels] = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [showNewDm, setShowNewDm] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimerRef = useRef({})
  const usersMapRef = useRef({})
  const socket = getSocket()

  // Seed current user into the map
  useEffect(() => {
    if (user?.id && user?.name) {
      usersMapRef.current[String(user.id)] = user.name
    }
  }, [user])

  // Load channels
  useEffect(() => {
    api.getChannels().then(r => setChannels(r.data || [])).catch(() => {})
  }, [])

  // Socket.io connection
  useEffect(() => {
    socket.connect()

    socket.on('message:receive', ({ channelId, message }) => {
      if (message.senderId?._id) {
        usersMapRef.current[String(message.senderId._id)] = message.senderId.name
      }
      if (activeChannel?._id === channelId || !activeChannel) {
        setMessages(prev => [...prev, message])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
      setChannels(prev => prev.map(ch =>
        ch._id === channelId ? { ...ch, lastMessage: message.body?.slice(0, 100), lastAt: new Date() } : ch
      ))
    })

    socket.on('message:typing', ({ channelId, userId }) => {
      setTypingUsers(prev => [...new Set([...prev, userId])])
      clearTimeout(typingTimerRef.current[userId])
      typingTimerRef.current[userId] = setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== userId))
      }, 2000)
    })

    return () => {
      socket.off('message:receive')
      socket.off('message:typing')
      socket.disconnect()
      socketInstance = null
    }
  }, [])

  // Join active channel room
  useEffect(() => {
    if (!activeChannel) return
    socket.emit('channel:join', activeChannel._id)
    api.getMessages(activeChannel._id)
      .then(r => {
        const msgs = r.data || []
        msgs.forEach(msg => {
          if (msg.senderId?._id) {
            usersMapRef.current[String(msg.senderId._id)] = msg.senderId.name
          }
        })
        setMessages(msgs)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .catch(() => {})
    return () => socket.emit('channel:leave', activeChannel._id)
  }, [activeChannel?._id])

  const handleSelectChannel = useCallback((ch) => {
    setActiveChannel(ch)
    setTypingUsers([])
  }, [])

  const handleSend = useCallback((body) => {
    if (!activeChannel) return
    // Optimistic: send via socket
    socket.emit('message:send', { channelId: activeChannel._id, body })
  }, [activeChannel])

  const handleChannelCreated = (channel) => {
    setChannels(prev => {
      if (prev.find(c => c._id === channel._id)) return prev
      return [channel, ...prev]
    })
    setActiveChannel(channel)
  }

  return (
    <div className="animate-slide-up h-[calc(100vh-120px)] flex flex-col">
      <div className="card flex-1 overflow-hidden flex min-h-0">
        {/* Channel list */}
        <div className="w-60 flex-shrink-0 border-r border-[var(--color-border)] overflow-hidden flex flex-col">
          <ChannelList
            channels={channels}
            activeId={activeChannel?._id}
            onSelect={handleSelectChannel}
            onNewDm={() => setShowNewDm(true)}
          />
        </div>

        {/* Message thread */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <MessageThread
            channel={activeChannel}
            messages={messages}
            onSend={handleSend}
            typingUsers={typingUsers}
            messagesEndRef={messagesEndRef}
            usersMapRef={usersMapRef}
          />
        </div>
      </div>

      {showNewDm && (
        <NewDmModal
          onClose={() => setShowNewDm(false)}
          onCreated={handleChannelCreated}
        />
      )}
    </div>
  )
}
