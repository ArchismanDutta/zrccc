// lib/socket.js — shared Socket.io-client singleton
// TopBar connects on login and listens for notifications.
// Messages.jsx joins/leaves channel rooms on top of the same connection.
import { io } from 'socket.io-client'

// If VITE_API_URL is a relative path (e.g. '/api'), pass undefined so socket.io
// connects to the current page origin (correct in production behind Nginx).
// If it's an absolute URL (e.g. 'http://localhost:5001'), strip '/api' to get the base.
const _base = (import.meta.env.VITE_API_URL || '').replace('/api', '')
const SOCKET_URL = _base.startsWith('http') ? _base : undefined

let _socket = null

/** Return (and lazily create) the shared socket instance. */
export function getSocket() {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
    })
  }
  return _socket
}

/**
 * Disconnect and destroy the singleton — called on logout so the next
 * login gets a clean, re-authenticated connection.
 */
export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect()
    _socket = null
  }
}
