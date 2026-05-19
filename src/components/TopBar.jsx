import { useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import useSimulationStore from '../store/simulationStore.js'

const NAV_LINKS = [
  { id: 'local-canvas', label: 'Local Canvas' },
  { id: 'shared-canvas', label: 'Shared Canvas' },
  { id: 'library',      label: 'Library' },
]

const ICON_BTNS = [
  { icon: 'analytics',      title: 'Analytics Dashboard' },
  { icon: 'group',          title: 'Collaborators' },
]

export default function TopBar() {
  const { labId, activePage, setActivePage, socketConnected, remoteCollaborators, activeSharedProjectId, closeSharedProject, sharedProjects, user, login, logout, sharedProjectName, showAnalyticsPanel, setShowAnalyticsPanel } = useSimulationStore()
  const [inviteCopied, setInviteCopied] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { roomId } = useParams()

  const [guestName, setGuestName] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleGuestLogin = async (e) => {
    e.preventDefault()
    if (!guestName.trim()) return
    setIsLoggingIn(true)
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guestName.trim() }),
      })
      
      if (!res.ok) {
        alert('Guest login failed. Please ensure the backend server is running.');
        return
      }
      
      const data = await res.json()
      if (data.token) {
        login(data.user, data.token)
        setGuestName('')
      }
    } catch (err) {
      console.error('Guest login failed', err)
      alert("Network error: Could not reach the backend server. Are you sure you ran 'npm run dev:all'?")
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleInvite = () => {
    // Generate the correct shareable room link
    const inviteUrl = `${window.location.origin}/shared/${roomId || activeSharedProjectId || labId}`
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteUrl)
        .then(() => {
          setInviteCopied(true)
          setTimeout(() => setInviteCopied(false), 2000)
        })
        .catch(err => {
          console.error('Failed to copy invite link', err)
          fallbackCopy(inviteUrl)
        })
    } else {
      fallbackCopy(inviteUrl)
    }
  }

  const fallbackCopy = (text) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy invite link', err)
    }
    document.body.removeChild(textArea)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-surface border-b-4 border-black shadow-none">

      {/* ── Left: logo + lab badge + nav ── */}
      <div className="flex items-center gap-8">

        {/* Logo */}
        <h1 className="text-xl font-black tracking-tighter text-black font-headline uppercase select-none">
          Virtual-Lab
        </h1>

        {/* Lab ID badge + socket status */}
        <div className={`flex items-center gap-2 transition-opacity ${activePage === 'shared-canvas' && activeSharedProjectId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button
            onClick={() => closeSharedProject()}
            className="w-7 h-7 flex items-center justify-center rounded-none bg-secondary hover:bg-primary border-2 border-black text-black transition-colors shadow-button hover:translate-x-[-1px] hover:translate-y-[-1px]"
            title="Back to Shared Projects"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          
          <div className="px-3 py-1 bg-tertiary border-2 border-black rounded-none flex items-center gap-1.5 shadow-button">
            <span
              className={`w-2 h-2 rounded-full border border-black ${
                socketConnected ? 'bg-primary animate-pulse' : 'bg-zinc-600'
              }`}
            />
          <span className="text-[10px] font-bold text-black font-label tracking-widest uppercase">
            {sharedProjectName ? sharedProjectName : `Lab ID: ${labId}`}
          </span>
          {socketConnected && (
            <span className="text-[9px] font-label text-black uppercase tracking-widest pl-1 border-l-2 border-black">
              {remoteCollaborators.length > 0
                ? `+${remoteCollaborators.length} live`
                : 'connected'}
            </span>
          )}
        </div>
      </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ id, label }) => (
            <button
              key={id}
              id={`nav-${id}`}
              onClick={() => {
                setActivePage(id)
                // If we're on a /shared/ route, navigate back to home
                if (location.pathname.startsWith('/shared/')) {
                  navigate('/')
                }
              }}
              className={`font-headline uppercase tracking-[0.05em] text-xs font-bold transition-all duration-200 ${
                activePage === id ? 'nav-link-active' : 'nav-link'
              }`}
            >
              {label}
            </button>
          ))}

          {/* Dynamic Project Tab */}
          {useSimulationStore.getState().activeExperimentConfig && (
            <div className="flex items-center gap-1 group">
              <button
                onClick={() => setActivePage('project')}
                className={`font-headline uppercase tracking-[0.05em] text-xs font-bold transition-all duration-200 py-1 px-2 rounded-none border-2 border-transparent ${
                  activePage === 'project' ? 'bg-primary text-black border-black shadow-button' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {useSimulationStore.getState().activeExperimentConfig.title}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  useSimulationStore.getState().closeActiveProject()
                }}
                className="w-5 h-5 flex items-center justify-center rounded-none bg-error border-2 border-black hover:bg-error-container text-black transition-all shadow-[1px_1px_0px_#000] translate-y-[-1px]"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* ── Right: avatars + icon buttons ── */}
      <div className="flex items-center gap-6">

        {/* Collaborator avatars */}
        <div className={`flex -space-x-2 items-center transition-opacity ${activePage === 'shared-canvas' && activeSharedProjectId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          
          {/* "You" Avatar */}
          <div
            title="You"
            className="relative w-8 h-8 rounded-none border-2 border-black overflow-hidden cursor-pointer hover:z-10 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-button transition-all bg-primary flex items-center justify-center"
          >
            <span className="text-[10px] font-bold text-black font-headline uppercase tracking-wider">
              ME
            </span>
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-none border-t-2 border-l-2 border-black bg-tertiary" />
          </div>

          {/* Remote Collaborators (from socket state) */}
          {remoteCollaborators.map((user, idx) => (
            <div
              key={user.id || idx}
              title={user.name || "Remote User"}
              className="relative w-8 h-8 rounded-none border-2 border-black overflow-hidden cursor-pointer hover:z-10 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-button transition-all bg-secondary flex items-center justify-center"
            >
              <span className="text-[10px] font-bold text-black font-headline uppercase tracking-wider">
                {(user.name || "RU").slice(0, 2)}
              </span>
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-none border-t-2 border-l-2 border-black bg-tertiary" />
            </div>
          ))}

          {/* Add collaborator / Invite Action */}
          <div className="relative flex items-center">
            <button
              id="add-collaborator-btn"
              onClick={handleInvite}
              className={`w-8 h-8 rounded-none border-2 border-black flex items-center justify-center transition-all ml-1 z-10 ${
                inviteCopied 
                  ? 'bg-tertiary text-black' 
                  : 'bg-surface hover:bg-secondary text-black'
              }`}
              title="Copy Invite Link"
            >
              <span className="material-symbols-outlined text-sm">
                {inviteCopied ? 'check' : 'add'}
              </span>
            </button>

            {/* Success Tooltip popup */}
            {inviteCopied && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-none shadow-brutal-sm animate-in fade-in slide-in-from-top-1 whitespace-nowrap pointer-events-none z-50">
                Link Copied!
              </div>
            )}
          </div>
        </div>

        {/* Icon buttons */}
        <div className="flex items-center gap-3">
          {ICON_BTNS.map(({ icon, title }) => {
            if (icon === 'group' && !(activePage === 'shared-canvas' && (activeSharedProjectId || roomId))) {
              return null
            }
            return (
              <button
                key={icon}
                id={`topbar-${icon}`}
                title={title}
                onClick={() => {
                  if (icon === 'analytics') {
                    setShowAnalyticsPanel(!showAnalyticsPanel)
                  }
                }}
                className={`material-symbols-outlined text-[22px] transition-colors duration-200 cursor-pointer hover:drop-shadow-[2px_2px_0px_#000] ${
                  icon === 'analytics' && showAnalyticsPanel
                    ? 'text-primary'
                    : 'text-black hover:text-primary'
                }`}
              >
                {icon}
              </button>
            )
          })}
          
          {/* User Profile / Guest Login */}
          {user ? (
            <div className="relative group cursor-pointer ml-2 flex items-center gap-2">
              {user.picture ? (
                <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-none border-2 border-black" />
              ) : (
                <div className="w-8 h-8 rounded-none bg-secondary border-2 border-black flex items-center justify-center font-bold text-xs text-black">
                  {(user.name || 'G').slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-black hidden sm:inline max-w-[80px] truncate">{user.name}</span>
              <button 
                onClick={logout} 
                className="hidden group-hover:block absolute right-0 top-10 bg-white border-2 border-black px-4 py-2 rounded-none text-xs text-black hover:bg-error transition-colors shadow-brutal-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <form onSubmit={handleGuestLogin} className="flex items-center gap-2 bg-white border-2 border-black rounded-none px-2.5 py-1 shadow-brutal-sm ml-2">
              <span className="material-symbols-outlined text-[16px] text-black">person</span>
              <input
                type="text"
                placeholder="Guest Name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={15}
                className="bg-transparent text-xs text-black focus:outline-none placeholder-zinc-500 w-24 sm:w-32 transition-all font-bold"
              />
              <button
                type="submit"
                disabled={isLoggingIn || !guestName.trim()}
                className="px-2 py-0.5 rounded-none border-2 border-black text-[10px] font-bold uppercase tracking-wider bg-primary hover:bg-secondary text-black disabled:opacity-50 transition-all cursor-pointer shadow-[1px_1px_0px_#000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none"
              >
                {isLoggingIn ? '...' : 'Go'}
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  )
}