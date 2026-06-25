// lib/socket.js — shared Socket.io-client singleton
// TopBar connects on login and listens for notifications.
// Messages.jsx joins/leaves channel rooms on top of the same connection.
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'

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
