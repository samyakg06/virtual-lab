import useSimulationStore from '../store/simulationStore';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SimulationCanvas from '../components/SimulationCanvas';
import BottomBar from '../components/BottomBar';
import ControlPalette from '../components/ControlPalette';
import AnalyticsPanel from '../components/AnalyticsPanel';
import SideNav from '../components/SideNav';

import { useCollaboration } from '../hooks/useCollaboration';

// ─── localStorage helpers for saved rooms ───
const ROOMS_KEY = 'virtualLab_savedRooms';

function loadSavedRooms() {
    try {
        return JSON.parse(localStorage.getItem(ROOMS_KEY)) || [];
    } catch { return []; }
}

function saveRoomToStorage(room) {
    const rooms = loadSavedRooms();
    // Don't duplicate
    if (rooms.find(r => r.roomId === room.roomId)) return;
    rooms.unshift(room);
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

function deleteRoomFromStorage(roomId) {
    const rooms = loadSavedRooms().filter(r => r.roomId !== roomId);
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

export default function SharedCanvasHome() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [savedRooms, setSavedRooms] = useState(loadSavedRooms);
    const setCanvasState = useSimulationStore(state => state.setCanvasState);
    
    // Start socket connection using our hook (only connects when roomId exists)
    const { broadcastAction, broadcastCursor } = useCollaboration(roomId);

    // When opening a shared link, fetch the room state
    useEffect(() => {
        if (!roomId) return;

        setIsLoading(true);
        fetch(`/api/rooms/${roomId}`)
            .then(res => {
                if (!res.ok) throw new Error('Room not found or invalid link.');
                return res.json();
            })
            .then(data => {
                if (data.projectName) {
                    useSimulationStore.getState().setSharedProjectName(data.projectName);
                }
                
                // If the state is a snapshot object (contains bodies)
                if (data.canvasState && data.canvasState.bodies !== undefined) {
                    const attemptLoad = () => {
                        const loadFn = useSimulationStore.getState().loadSnapshotFn;
                        if (loadFn) {
                            loadFn(data.canvasState);
                        } else {
                            setTimeout(attemptLoad, 50); // wait for canvas to mount and register
                        }
                    };
                    attemptLoad();
                } else if (data.canvasState && setCanvasState) {
                    // Fallback to old full-store merge
                    setCanvasState(data.canvasState);
                }
                // Also save this room locally so it appears in the list
                saveRoomToStorage({
                    roomId: data.roomId,
                    projectName: data.projectName || 'Untitled',
                    createdAt: data.createdAt || Date.now()
                });
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
                setIsLoading(false);
            });
            
        return () => {
            useSimulationStore.getState().setSharedProjectName('');
        };
    }, [roomId, setCanvasState]);

    // Handle creating a new room
    const handleCreateRoom = async () => {
        const finalName = projectName.trim() || 'My Shared Experiment';
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/rooms', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectName: finalName })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server error (${res.status})`);
            }
            const data = await res.json();

            // Save to localStorage so it shows up in the list
            const newRoom = {
                roomId: data.roomId,
                projectName: projectName.trim(),
                createdAt: Date.now()
            };
            saveRoomToStorage(newRoom);
            setSavedRooms(loadSavedRooms());

            navigate(`/shared/${data.roomId}`);
        } catch (err) {
            console.error('Create room failed:', err);
            setError(err.message);
            setIsLoading(false);
        }
    };

    // Handle deleting a saved room
    const handleDeleteRoom = (e, roomIdToDelete) => {
        e.stopPropagation();
        fetch(`/api/rooms/${roomIdToDelete}`, { method: 'DELETE' }).catch(console.error);
        deleteRoomFromStorage(roomIdToDelete);
        setSavedRooms(loadSavedRooms());
    };

    // Copy share link to clipboard
    const handleCopyLink = (e, rid) => {
        e.stopPropagation();
        const url = `${window.location.origin}/shared/${rid}`;
        navigator.clipboard.writeText(url).catch(() => {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
        // Brief visual feedback
        const btn = e.currentTarget;
        const orig = btn.textContent;
        btn.textContent = 'check';
        setTimeout(() => { btn.textContent = orig; }, 1200);
    };

    // Format date
    const formatDate = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // ─── NO ROOM ID → Show "Create Room" form + saved rooms ───
    if (!roomId) {
        return (
            <div className="flex flex-col h-full items-center py-10 px-4 overflow-y-auto bg-transparent backdrop-blur-md">
                
                {/* Create New Room Card */}
                <div className="bg-surface-container border border-white/10 p-8 rounded-2xl shadow-2xl text-center max-w-lg w-full relative overflow-hidden mb-8">
                    {/* Decorative glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none" />
                    
                    <span className="material-symbols-outlined text-5xl text-primary mb-4 relative z-10">groups</span>
                    <h2 className="text-2xl font-headline font-bold text-white mb-2 relative z-10">Collaborative Canvas</h2>
                    <p className="text-zinc-400 mb-6 text-sm relative z-10">Create a new shared laboratory to invite teammates and simulate physics in real-time.</p>
                    
                    <div className="flex gap-3 relative z-10">
                        <input 
                            type="text" 
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                            placeholder="My Shared Experiment"
                            className="flex-1 bg-surface border border-outline-variant/30 text-on-surface rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                        />
                        <button 
                            onClick={handleCreateRoom}
                            disabled={isLoading || !projectName.trim()}
                            className="bg-primary hover:bg-primary/90 text-on-primary font-bold py-3 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(47,245,255,0.3)] hover:shadow-[0_0_25px_rgba(47,245,255,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {isLoading ? 'Creating...' : '+ Create Room'}
                        </button>
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs mt-3 relative z-10">{error}</p>
                    )}
                </div>

                {/* Saved Rooms List */}
                {savedRooms.length > 0 && (
                    <div className="max-w-lg w-full">
                        <h3 className="text-sm font-headline font-bold text-zinc-400 uppercase tracking-widest mb-4 px-1">
                            Your Rooms ({savedRooms.length})
                        </h3>
                        <div className="flex flex-col gap-3">
                            {savedRooms.map((room) => (
                                <div
                                    key={room.roomId}
                                    onClick={() => navigate(`/shared/${room.roomId}`)}
                                    className="bg-surface-container border border-white/5 rounded-xl px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:border-primary/30 hover:bg-surface-container-high transition-all group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="material-symbols-outlined text-primary/60 text-xl group-hover:text-primary transition-colors">science</span>
                                        <div className="min-w-0">
                                            <p className="text-white font-bold text-sm truncate group-hover:text-primary transition-colors">
                                                {room.projectName}
                                            </p>
                                            <p className="text-zinc-500 text-[11px]">
                                                {formatDate(room.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Copy link */}
                                        <button
                                            onClick={(e) => handleCopyLink(e, room.roomId)}
                                            className="material-symbols-outlined text-[18px] text-zinc-500 hover:text-primary transition-colors p-1"
                                            title="Copy share link"
                                        >
                                            link
                                        </button>
                                        {/* Delete */}
                                        <button
                                            onClick={(e) => handleDeleteRoom(e, room.roomId)}
                                            className="material-symbols-outlined text-[18px] text-zinc-500 hover:text-red-400 transition-colors p-1"
                                            title="Remove from list"
                                        >
                                            delete
                                        </button>
                                        {/* Open arrow */}
                                        <span className="material-symbols-outlined text-zinc-600 group-hover:text-primary transition-colors text-sm">
                                            arrow_forward
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {savedRooms.length === 0 && (
                    <p className="text-zinc-600 text-xs mt-2">No rooms yet. Create one above or paste a shared link in the browser.</p>
                )}
            </div>
        );
    }

    // ─── LOADING STATE (only when fetching an existing room) ───
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center text-zinc-400">
                <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">progress_activity</span>
                    <p>Loading Shared Experiment...</p>
                </div>
            </div>
        );
    }

    // ─── ERROR STATE ───
    if (error) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-red-400 mb-4">error</span>
                    <p className="text-red-400 mb-4">{error}</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="bg-surface-container border border-white/10 px-6 py-2 rounded-lg text-zinc-300 hover:bg-surface-container-high transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // ─── ROOM LOADED → Show canvas ───
    // ─── ROOM LOADED → Show canvas ───
    return (
        <div className="bg-surface text-on-surface font-body h-screen w-screen overflow-hidden">
            <TopBar roomId={roomId} />
            <SideNav />
            <BottomBar />
            <main className="fixed inset-0 pt-16 pl-20 pb-16 blueprint-grid overflow-hidden z-0">
                <div className="relative w-full h-full">
                    <SimulationCanvas 
                        roomId={roomId} 
                        broadcastAction={broadcastAction} 
                        broadcastCursor={broadcastCursor} 
                    />
                    <ControlPalette />
                    <AnalyticsPanel />
                </div>
            </main>
        </div>
    );
}