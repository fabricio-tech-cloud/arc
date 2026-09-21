function Ring({ value, max = 4 }: { value: number; max?: number }) {
  const size = 44;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = c * (1 - pct);

  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#fff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-white">
        {value}
      </span>
    </div>
  );
}

function CardMenu() {
  return (
    <button
      type="button"
      aria-label="Optionen"
      className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 transition hover:bg-white/8 hover:text-white/80"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8h16M4 12h12M4 16h8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function monthGrid(year: number, monthIndex: number, heatMap: Record<string, number>) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7; // Monday start
  const cells: { key: string; active: boolean; empty?: boolean }[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ key: `pad-${i}`, active: false, empty: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key: date, active: (heatMap[date] ?? 0) > 0 });
  }
  return cells;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function OverviewHeatmap({ heatMap }: { heatMap: Record<string, number> }) {
  const now = new Date();
  const months = [2, 1, 0].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS[d.getMonth()] };
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      {months.map((m) => {
        const cells = monthGrid(m.year, m.month, heatMap);
        return (
          <div key={`${m.year}-${m.month}`} className="min-w-[5.5rem]">
            <p className="mb-2 text-[11px] text-white/45">{m.label}</p>
            <div className="grid grid-cols-7 gap-[3px]">
              {cells.map((cell) => (
                <span
                  key={cell.key}
                  className={`h-[5px] w-[5px] rounded-full ${
                    cell.empty ? "opacity-0" : cell.active ? "bg-white" : "bg-white/15"
                  }`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressRing(props: { value: number; max?: number }) {
  return <Ring {...props} />;
}

export function OverviewCardMenu() {
  return <CardMenu />;
}
