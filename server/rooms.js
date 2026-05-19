/**
 * Room state manager.
 * A "room" = one Lab session identified by labId.
 * Tracks: connected users, their cursor positions, body snapshots.
 */

const rooms = new Map() // labId → RoomState

function getOrCreateRoom(labId) {
  if (!rooms.has(labId)) {
    rooms.set(labId, {
      labId,
      users:      new Map(), // socketId → UserInfo
      bodies:     [],        // latest body snapshot from host
      runState:   'idle',
    })
  }
  return rooms.get(labId)
}

function joinRoom(labId, socketId, userInfo) {
  const room = getOrCreateRoom(labId)
  room.users.set(socketId, {
    id:       socketId,
    name:     userInfo.name  ?? 'Guest',
    color:    userInfo.color ?? 'primary',
    cursor:   { x: 0, y: 0 },
    action:   '',
    joinedAt: Date.now(),
  })
  return room
}

function leaveRoom(socketId) {
  for (const [labId, room] of rooms.entries()) {
    if (room.users.has(socketId)) {
      room.users.delete(socketId)
      if (room.users.size === 0) rooms.delete(labId) // GC empty rooms
      return labId
    }
  }
  return null
}

function updateCursor(socketId, cursor, action) {
  for (const room of rooms.values()) {
    if (room.users.has(socketId)) {
      const user = room.users.get(socketId)
      user.cursor = cursor
      user.action = action ?? ''
      return room
    }
  }
  return null
}

function updateBodies(labId, bodies) {
  const room = rooms.get(labId)
  if (room) room.bodies = bodies
  return room
}

function updateRunState(labId, runState) {
  const room = rooms.get(labId)
  if (room) room.runState = runState
  return room
}

function getRoomUsers(labId) {
  const room = rooms.get(labId)
  if (!room) return []
  return Array.from(room.users.values())
}

function getRoomState(labId) {
  return rooms.get(labId) ?? null
}

module.exports = {
  joinRoom, leaveRoom, updateCursor,
  updateBodies, updateRunState,
  getRoomUsers, getRoomState,
}
