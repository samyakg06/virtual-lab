import useSimulationStore from '../store/simulationStore'

const TABS = [
  { id: 'objects', icon: 'category',     label: 'Objects' },
  { id: 'joints',  icon: 'link',         label: 'Joints'  },
  { id: 'locks',   icon: 'lock_open',    label: 'Locks'   },
  { id: 'forces',  icon: 'dynamic_form', label: 'Forces'  },
]

export default function SideNav() {
  const { activeTab, setActiveTab } = useSimulationStore()

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 w-20 bg-white border-r-4 border-black flex flex-col">
      <div className="flex flex-col items-center py-6 gap-3">
        {TABS.map(({ id, icon, label }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              id={`sidenav-${id}`}
              onClick={() => setActiveTab(id)}
              title={label}
              className={`group flex flex-col items-center gap-1 w-16 py-3 rounded-none transition-all duration-200 cursor-pointer ${
                isActive ? 'sidenav-tab-active' : 'sidenav-tab'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-colors ${
                  isActive ? 'text-black' : 'text-zinc-600 group-hover:text-black'
                }`}
                style={isActive ? { fontVariationSettings: "'FILL' 0.3" } : {}}
              >
                {icon}
              </span>
              <span
                className={`font-headline text-[9px] tracking-wide uppercase font-bold transition-colors ${
                  isActive ? 'text-black' : 'text-zinc-600 group-hover:text-black'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
