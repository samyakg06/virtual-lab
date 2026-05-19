import { useEffect, useRef, useCallback } from 'react';
import socket from '../services/socket';
import useSimulationStore from '../store/simulationStore';

export function useCollaboration(roomId) {
    // Use refs to avoid stale closures and prevent the effect from re-running
    // every time these store functions get a new reference.
    const storeRef = useRef();
    storeRef.current = {
        updateCollaboratorCursor: useSimulationStore(state => state.updateCollaboratorCursor),
        removeCollaborator: useSimulationStore(state => state.removeCollaborator),
        setRemoteCollaborators: useSimulationStore(state => state.setRemoteCollaborators),
        applyRemoteAction: useSimulationStore(state => state.applyRemoteAction),
    };

    useEffect(() => {
        if (!roomId) return;

        // Register the broadcast function in the store so spawnBody can auto-broadcast
        const broadcastForStore = (actionType, payload) => {
            console.log('[Collab] Store broadcasting action:', actionType, payload);
            socket.emit('canvas-action', { roomId, action: actionType, payload });
        };
        useSimulationStore.getState().setBroadcastActionFn(broadcastForStore);

        const onConnect = () => {
            console.log('[Collab] Socket connected, joining room:', roomId);
            socket.emit('join-room', roomId);
        };

        const onUserJoined = (userId) => {
            console.log('[Collab] A teammate joined the room:', userId);
        };

        const onCursorMove = (data) => {
            storeRef.current.updateCollaboratorCursor?.(data.socketId, data.x, data.y, data.name);
        };

        const onUserDisconnected = (socketId) => {
            storeRef.current.removeCollaborator?.(socketId);
        };

        const onRoomDeleted = () => {
            alert('The owner has permanently deleted this room. You will be redirected to the home page.');
            window.location.href = '/';
        };

        const onCanvasAction = (data) => {
            console.log('[Collab] Received canvas-action:', data.action, data.payload);
            storeRef.current.applyRemoteAction?.(data);
        };

        // Register listeners BEFORE connecting so nothing is missed
        socket.on('connect', onConnect);
        socket.on('user-joined', onUserJoined);
        socket.on('cursor-move', onCursorMove);
        socket.on('user-disconnected', onUserDisconnected);
        socket.on('room-deleted', onRoomDeleted);
        socket.on('canvas-action', onCanvasAction);

        // Connect — if already connected, manually fire the join
        if (socket.connected) {
            console.log('[Collab] Socket already connected, joining room:', roomId);
            socket.emit('join-room', roomId);
        } else {
            socket.connect();
        }

        // Cleanup when leaving the page
        return () => {
            socket.emit('leave-room', roomId);
            socket.off('connect', onConnect);
            socket.off('user-joined', onUserJoined);
            socket.off('cursor-move', onCursorMove);
            socket.off('canvas-action', onCanvasAction);
            socket.off('user-disconnected', onUserDisconnected);
            socket.off('room-deleted', onRoomDeleted);
            socket.disconnect();
            
            // Clear all ghost cursors when we leave
            storeRef.current.setRemoteCollaborators?.([]);

            // Unregister the broadcast function
            useSimulationStore.getState().setBroadcastActionFn(null);
        };
    }, [roomId]); // Only re-run when roomId changes — store functions accessed via ref

    // Functions to call from your components to send data OUT
    const broadcastAction = useCallback((actionType, payload) => {
        console.log('[Collab] Broadcasting action:', actionType, payload);
        socket.emit('canvas-action', { roomId, action: actionType, payload });
        
        // Save to DB (you can debounce this if it fires too often)
        const storeState = useSimulationStore.getState();
        const snapshotFn = storeState.getSnapshotFn;
        
        if (snapshotFn) {
            const physicsSnapshot = snapshotFn();
            socket.emit('save-state', { roomId, canvasState: physicsSnapshot });
        } else {
            socket.emit('save-state', { roomId, canvasState: storeState });
        }
    }, [roomId]);

    const broadcastCursor = useCallback((x, y) => {
        const userName = useSimulationStore.getState().user?.name || 'Guest';
        socket.emit('cursor-move', { roomId, x, y, name: userName });
    }, [roomId]);

    return { broadcastAction, broadcastCursor };
}