"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type RadarDatum = {
  label: string;
  value: number;
  /** Optional secondary info shown in tooltip. */
  detail?: string;
};

type Props = {
  data: RadarDatum[];
  height?: number;
  color?: string;
  /** Pads to at least 3 axes so the polygon renders. */
  minAxes?: number;
};

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RadarDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  if (!d.label) return null;
  return (
    <div className="rounded-[1rem] border border-white/10 bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-white">{d.label}</p>
      <p className="mt-0.5 tabular-nums text-[#a78bfa]">{d.value} / 100</p>
      {d.detail ? <p className="mt-0.5 text-white/50">{d.detail}</p> : null}
    </div>
  );
}

export function RadarChart({ data, height = 300, color = "#a78bfa", minAxes = 3 }: Props) {
  const padded: RadarDatum[] = [...data];
  while (padded.length < minAxes) padded.push({ label: "", value: 0 });

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar data={padded} outerRadius="72%" margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" gridType="polygon" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "rgba(232,234,238,0.7)", fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tickCount={6}
            angle={90}
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
            axisLine={false}
            stroke="rgba(255,255,255,0.05)"
          />
          <Tooltip content={<TooltipContent />} cursor={false} />
          <Radar
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.22}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#fff", stroke: color, strokeWidth: 2 }}
            isAnimationActive
            animationDuration={600}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
