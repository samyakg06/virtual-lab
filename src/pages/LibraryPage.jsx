import { useState, useMemo } from 'react'
import ExperimentCard from '../components/ExperimentCard'
import { EXPERIMENTS, CATEGORIES, DIFFICULTIES } from '../data/sampleExperiments'
import useSimulationStore from '../store/simulationStore'

export default function LibraryPage() {
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [loaded,     setLoaded]     = useState(null)

  const { spawnBody, setActivePage, setRunState } = useSimulationStore()

  /* ── Filter experiments ── */
  const filtered = useMemo(() => {
    return EXPERIMENTS.filter((e) => {
      const matchSearch = !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      const matchCat  = category   === 'All' || e.category   === category
      const matchDiff = difficulty === 'All' || e.difficulty === difficulty
      return matchSearch && matchCat && matchDiff
    })
  }, [search, category, difficulty])

  /* ── Load an experiment into the physics engine ── */
  const handleLoad = (experiment) => {
    setLoaded(experiment.id)

    // Clear simulation then queue experiment for when canvas mounts
    setRunState('idle')
    useSimulationStore.getState().setPendingExperiment(experiment)
  }

  const pillBase = 'px-3 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-widest border transition-all duration-150 cursor-pointer'
  const pillActive = `${pillBase} bg-primary/15 text-primary border-primary/30`
  const pillInactive = `${pillBase} text-zinc-600 border-outline-variant/20 hover:border-outline-variant/40 hover:text-zinc-400`

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* ── Page header ── */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] font-label text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-primary" />
              Virtual-Lab
            </p>
            <h2 className="text-3xl font-headline font-black text-on-surface tracking-tighter">
              Experiment Library
            </h2>
            <p className="text-sm font-body text-zinc-500 mt-1">
              Browse, load, and explore {EXPERIMENTS.length} pre-built physics scenarios
            </p>
          </div>
          {/* Stats */}
          <div className="flex gap-6">
            {[
              { label: 'Experiments', value: EXPERIMENTS.length },
              { label: 'Categories',  value: CATEGORIES.length - 1 },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-end">
                <span className="text-2xl font-headline font-black text-primary">{value}</span>
                <span className="text-[9px] font-label text-zinc-600 uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Search + filters ── */}
        <div className="flex flex-col gap-6 mb-12">
          
          {/* Sleek Search bar */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="relative flex items-center bg-surface-container-highest/30 backdrop-blur-xl border border-white/10 rounded-2xl p-2 transition-all hover:border-primary/30 focus-within:border-primary/50 focus-within:bg-surface-container-highest/50">
              <span className="material-symbols-outlined text-zinc-500 pl-4 pr-2">search</span>
              <input
                id="library-search"
                type="text"
                placeholder="Search experiments, concepts, or tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none py-3 text-sm font-body text-on-surface placeholder-zinc-600 tracking-wide"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="material-symbols-outlined text-zinc-500 hover:text-primary pr-4 transition-colors"
                >
                  close
                </button>
              )}
            </div>
          </div>

          {/* Filter rows */}
          <div className="flex flex-wrap items-center justify-between gap-6 px-2">
            
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-label text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">category</span> Category
              </span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCategory(c)} className={category === c ? pillActive : pillInactive}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-label text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">speed</span> Difficulty
              </span>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={difficulty === d ? pillActive : pillInactive}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count line */}
          <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent relative mt-2">
            <span className="absolute -top-2.5 left-0 bg-surface pr-4 text-[10px] font-label text-zinc-500 uppercase tracking-widest">
              Showing {filtered.length} of {EXPERIMENTS.length}
              {search && <span className="text-primary ml-1">· "{search}"</span>}
            </span>
          </div>
        </div>

        {/* ── Card grid ── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((exp) => (
              <ExperimentCard
                key={exp.id}
                experiment={exp}
                onLoad={handleLoad}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="material-symbols-outlined text-outline text-5xl">search_off</span>
            <p className="text-outline font-label text-sm uppercase tracking-widest">
              No experiments match your filters
            </p>
            <button
              onClick={() => { setSearch(''); setCategory('All'); setDifficulty('All') }}
              className="text-[10px] font-label text-primary uppercase tracking-widest hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-12 pt-6 border-t border-white/[0.05] flex items-center justify-between">
          <p className="text-[10px] font-label text-zinc-700 uppercase tracking-widest">
            Virtual-Lab Experiment Library · Physics-201
          </p>
          <button
            id="library-back-btn"
            onClick={() => setActivePage('local-canvas')}
            className="flex items-center gap-1.5 text-[10px] font-label text-zinc-600 hover:text-primary uppercase tracking-widest transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Simulation
          </button>
        </div>
      </div>
    </div>
  )
}
