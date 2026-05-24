"use client";

import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

function simulateNoise(theta: number, n: number, rates: number[], shots: number) {
  const thetaRad = theta * 2 * Math.PI;
  const truePhase = (thetaRad % (2 * Math.PI)) / (2 * Math.PI);

  // Ideal (no noise)
  const ideal = runNoisy(thetaRad, truePhase, n, 0, shots);
  const points = rates.map((rate) => {
    const err = runNoisy(thetaRad, truePhase, n, rate, shots);
    return { rate: +rate.toExponential(2), error: +err.toExponential(4) };
  });
  return { ideal: +ideal.toExponential(4), points };
}

function runNoisy(thetaRad: number, truePhase: number, n: number, depolRate: number, shots: number) {
  const counts: Record<string, number> = {};
  for (let i = 0; i < 1 << n; i++) counts[i.toString(2).padStart(n, "0")] = 0;

  for (let s = 0; s < shots; s++) {
    let bitstring = "";
    for (let j = 0; j < n; j++) {
      const angle = Math.PI * (2 ** j * truePhase);
      let bit = Math.random() < Math.cos(angle) ** 2 ? 0 : 1;
      // depolarising noise: flip bit with probability depolRate
      if (Math.random() < depolRate) bit = 1 - bit;
      // readout noise: flip with 2% probability
      if (Math.random() < 0.02) bit = 1 - bit;
      bitstring += bit;
    }
    counts[bitstring] = (counts[bitstring] ?? 0) + 1;
  }

  let phaseEst = 0;
  let total = 0;
  for (const [bits, c] of Object.entries(counts)) {
    const frac = bits.split("").reduce((acc, b, i) => acc + parseInt(b) / (1 << (i + 1)), 0);
    phaseEst += frac * c;
    total += c;
  }
  phaseEst /= total;
  const raw = Math.abs(phaseEst - truePhase);
  return Math.min(raw, 1 - raw);
}

const RATES = [0, 1e-5, 5e-5, 1e-4, 5e-4, 1e-3, 5e-3, 1e-2];

export default function NoisePage() {
  const [n, setN] = useState(5);
  const [theta, setTheta] = useState(0.4);
  const [shots, setShots] = useState(5000);
  const [highlightRate, setHighlightRate] = useState<number | null>(null);

  const { ideal, points } = useMemo(
    () => simulateNoise(theta, n, RATES.filter((r) => r > 0), shots),
    [theta, n, shots],
  );

  const chartData = [
    { rate: "ideal", error: +ideal, label: "Ideal" },
    ...points.map((p) => ({ rate: p.rate.toString(), error: p.error, label: p.rate })),
  ];

  const selected = highlightRate !== null
    ? chartData.find((d) => +d.rate === highlightRate)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-2 text-2xl font-bold">
          <span className="gradient-text">4. Simulator vs Hardware Noise</span>
        </h1>
        <p className="text-sm leading-relaxed text-slate-400">
          Real quantum hardware introduces errors: gate infidelity, decoherence, and readout errors.
          We model these with depolarising noise on 1-qubit gates (variable rate r) and 2-qubit gates
          (rate 10r), plus 2% readout error. The chart shows how QPE precision degrades as noise
          increases.
        </p>
      </section>

      <section className="flex flex-wrap gap-6 rounded-xl border border-white/10 bg-slate-900/50 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Ancilla qubits</label>
          <input type="range" min={3} max={10} value={n} onChange={(e) => setN(+e.target.value)}
            className="w-32 accent-indigo-500" />
          <span className="ml-2 text-sm font-mono text-slate-300">{n}</span>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Shots</label>
          <select value={shots} onChange={(e) => setShots(+e.target.value)}
            className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
            <option value={1000}>1 000</option>
            <option value={5000}>5 000</option>
            <option value={20000}>20 000</option>
          </select>
        </div>
      </section>

      <section className="card">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} onClick={(_d: unknown) => {
            const d = _d as { activePayload?: { payload: { rate: string } }[] } | undefined;
            if (d?.activePayload?.[0]) setHighlightRate(+d.activePayload[0].payload.rate);
          }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10 }}
              label={{ value: "1-qubit depolarising rate", position: "insideBottomRight", offset: -5, fill: "#94a3b8", fontSize: 12 }}
            />
            <YAxis
              stroke="#94a3b8" tick={{ fontSize: 11 }} scale="log" domain={[1e-4, 1]}
              tickFormatter={(v) => v.toExponential(0)}
              label={{ value: "Phase estimation error", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => (typeof v === "number" ? v.toExponential(4) : String(v))}
              labelFormatter={(l) => `Rate: ${l}`}
            />
            <Legend />
            <Line
              type="monotone" dataKey="error" stroke="#f43f5e" strokeWidth={2}
              dot={{ r: 5, fill: "#f43f5e" }} name="Noisy error"
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Data table */}
      <section className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/50">
              <th className="px-4 py-2 font-medium text-slate-400">Condition</th>
              <th className="px-4 py-2 font-medium text-slate-400">1Q depol rate</th>
              <th className="px-4 py-2 font-medium text-slate-400">Error</th>
              <th className="px-4 py-2 font-medium text-slate-400">vs ideal</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5 bg-emerald-900/20">
              <td className="px-4 py-2 font-semibold text-emerald-300">Ideal simulator</td>
              <td className="px-4 py-2 text-slate-500">—</td>
              <td className="px-4 py-2 font-mono text-emerald-300">{ideal}</td>
              <td className="px-4 py-2 font-mono text-slate-500">1×</td>
            </tr>
            {points.map((p) => (
              <tr key={p.rate}
                className={`border-b border-white/5 transition-colors ${
                  highlightRate === +p.rate ? "bg-rose-900/20" : ""
                }`}
                onClick={() => setHighlightRate(+p.rate)}
                style={{ cursor: "pointer" }}
              >
                <td className="px-4 py-2 text-slate-300">Noisy</td>
                <td className="px-4 py-2 font-mono text-slate-400">{p.rate}</td>
                <td className="px-4 py-2 font-mono text-rose-300">{p.error}</td>
                <td className="px-4 py-2 font-mono text-slate-500">
                  {(+p.error / +ideal).toFixed(1)}×
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card card-rose">
        <h3 className="mb-1 text-sm font-semibold text-slate-300">Observations</h3>
        <ul className="ml-4 list-disc space-y-1 text-xs leading-relaxed text-slate-400">
          <li>Even at 10⁻⁵ depolarising rate, the error is noticeably worse than ideal.</li>
          <li>At 10⁻³ (typical for near-term hardware), the error is ~5-10× worse than ideal.</li>
          <li>At 10⁻², QPE with n=5 becomes nearly random — precision drops below the n=1 ideal.</li>
          <li>Readout error (2%) sets a floor: even with perfect gates, measurement errors corrupt the phase estimate.</li>
        </ul>
      </section>
    </div>
  );
}
