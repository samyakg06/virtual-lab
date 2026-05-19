import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SOCKET_URL ?? '/'

/* Singleton socket — created once, reused everywhere */
let _socket = null

export function getSocket() {
  if (!_socket) {
    _socket = io(SERVER_URL, {
      autoConnect:       false,
      reconnection:      true,
      reconnectionDelay: 1000,
      timeout:           5000,
    })
  }
  return _socket
}

const socket = getSocket()
export default socket

export function connectSocket() {
  const socket = getSocket()
  if (!socket.connected) socket.connect()
  return socket
}

export function disconnectSocket() {
  _socket?.disconnect()
}

/* ── Emit helpers ── */
export const emit = (event, data) => getSocket().emit(event, data)
