import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'

/* ── Custom tooltip ── */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-container-highest border border-outline-variant/20 rounded px-2 py-1 text-[10px] font-label shadow-lg">
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.fill }} className="flex gap-1 items-center">
          <span className="uppercase font-bold">{p.name}:</span>
          <span>{p.value} J</span>
        </div>
      ))}
    </div>
  )
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className="h-28 flex flex-col items-center justify-center gap-2">
      <div className="flex items-end gap-1 h-12 opacity-20">
        {[35, 55, 45, 65, 50, 70, 40, 60, 55, 75, 45, 65].map((h, i) => (
          <div
            key={i}
            className="w-3 rounded-t"
            style={{
              height: `${h}%`,
              background: i % 2 === 0
                ? 'rgba(47,245,255,0.6)'
                : 'rgba(99,247,255,0.3)',
            }}
          />
        ))}
      </div>
      <p className="text-[9px] font-label text-zinc-700 uppercase tracking-widest">
        Run simulation to see live data
      </p>
    </div>
  )
}

export default function EnergyBarChart({ data }) {
  if (!data || data.length === 0) return <EmptyState />

  return (
    <div className="h-28 relative">
      {/* Blueprint grid behind chart */}
      <div className="absolute inset-0 blueprint-grid opacity-30 rounded" />

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
          barCategoryGap="20%"
          barGap={1}
        >
          <CartesianGrid
            strokeDasharray="3 2"
            stroke="rgba(60,73,78,0.3)"
            vertical={false}
          />
          <XAxis dataKey="t" hide />
          <YAxis
            tick={{ fill: '#52525b', fontSize: 8, fontFamily: 'Space Grotesk' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(47,245,255,0.04)' }} />
          <Bar dataKey="ke" name="KE" radius={[2, 2, 0, 0]} maxBarSize={10}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={`rgba(47,245,255,${0.35 + (i / data.length) * 0.55})`}
              />
            ))}
          </Bar>
          <Bar dataKey="pe" name="PE" radius={[2, 2, 0, 0]} maxBarSize={10}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={`rgba(99,247,255,${0.2 + (i / data.length) * 0.45})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="absolute bottom-0.5 right-1 flex gap-2">
        {[
          { color: 'rgba(47,245,255,0.7)', label: 'KE' },
          { color: 'rgba(99,247,255,0.5)', label: 'PE' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
            <span className="text-[8px] font-label text-zinc-600 uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
