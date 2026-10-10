import { money } from '../constants'
import './Charts.css'

const short = (n) => (n >= 1000 ? `R ${+(n / 1000).toFixed(1)}k` : `R ${n}`)

// Round the axis maximum up to a tidy number that splits evenly into 4 steps.
function niceMax(value) {
  const mag = 10 ** Math.floor(Math.log10(value))
  const step = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((s) => s * mag >= value)
  return step * mag
}

// data: [{ label, value }]
export function BarChart({ data, ariaLabel }) {
  const W = 560
  const H = 260
  const L = 54
  const R = 12
  const T = 16
  const B = 34
  const iw = W - L - R
  const ih = H - T - B

  const max = niceMax(Math.max(...data.map((d) => d.value), 1))
  const ticks = [0, 1, 2, 3, 4].map((i) => (max * i) / 4)
  const y = (v) => T + ih - (v / max) * ih
  const step = iw / data.length
  const bw = Math.min(46, step * 0.55)

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid-line" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text className="axis-text" x={L - 10} y={y(t) + 4} textAnchor="end">
            {short(t)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const h = (d.value / max) * ih
        const x = L + step * i + (step - bw) / 2
        const last = i === data.length - 1
        return (
          <g key={d.label}>
            <title>{`${d.label}: ${money(d.value)}`}</title>
            {d.value > 0 && (
              <rect
                className={last ? 'bar bar-last' : 'bar'}
                x={x}
                y={y(d.value)}
                width={bw}
                height={h}
                rx={Math.min(bw / 2, h / 2)}
                style={{ animationDelay: `${i * 60}ms` }}
              />
            )}
            <text
              className="axis-text"
              x={x + bw / 2}
              y={H - 10}
              textAnchor="middle"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// slices: [{ label, value }]
export function DonutChart({ slices, centerLabel, ariaLabel }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = 70
  const C = 2 * Math.PI * r
  // Each slice starts where the previous one ended.
  const starts = slices.map((_, i) =>
    slices.slice(0, i).reduce((s, x) => s + (x.value / total) * C, 0),
  )

  return (
    <div className="donut-wrap">
      <svg
        className="donut"
        viewBox="0 0 200 200"
        role="img"
        aria-label={ariaLabel}
      >
        <circle className="donut-track" cx="100" cy="100" r={r} />
        {slices.map((s, i) => {
          const len = (s.value / total) * C
          return (
            <circle
              key={s.label}
              className={`donut-slice slice-${i % 5}`}
              cx="100"
              cy="100"
              r={r}
              strokeDasharray={`${Math.max(len - 3, 0)} ${C - Math.max(len - 3, 0)}`}
              strokeDashoffset={-starts[i]}
              transform="rotate(-90 100 100)"
            >
              <title>{`${s.label}: ${money(s.value)}`}</title>
            </circle>
          )
        })}
        <text className="donut-total" x="100" y="104" textAnchor="middle">
          {short(total)}
        </text>
        <text className="donut-sub" x="100" y="124" textAnchor="middle">
          {centerLabel}
        </text>
      </svg>

      <ul className="legend">
        {slices.map((s, i) => (
          <li key={s.label}>
            <span className={`swatch slice-bg-${i % 5}`} aria-hidden="true" />
            <span className="legend-label">{s.label}</span>
            <span className="legend-value">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
