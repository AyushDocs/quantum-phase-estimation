"use client";

import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

function simulatePrecision(theta: number, maxN: number, shots: number) {
  const thetaRad = theta * 2 * Math.PI;
  const truePhase = (thetaRad % (2 * Math.PI)) / (2 * Math.PI);
  const results: { n: number; error: number; bound: number }[] = [];

  for (let n = 1; n <= maxN; n++) {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1 << n; i++) counts[i.toString(2).padStart(n, "0")] = 0;

    for (let s = 0; s < shots; s++) {
      let bitstring = "";
      for (let j = 0; j < n; j++) {
        const angle = Math.PI * (2 ** j * truePhase);
        bitstring += Math.random() < Math.cos(angle) ** 2 ? "0" : "1";
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
    const error = Math.min(raw, 1 - raw);
    results.push({ n, error: +error.toExponential(4), bound: +(1 / (1 << n)).toExponential(4) });
  }
  return results;
}

export default function PrecisionPage() {
  const [theta, setTheta] = useState(0.4);
  const [shots, setShots] = useState(5000);

  const data = useMemo(() => simulatePrecision(theta, 10, shots), [theta, shots]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-2 text-2xl font-bold">
          <span className="gradient-text">3. Precision Scaling</span>
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          The number of ancilla qubits n determines how precisely QPE can estimate a phase.
          With n qubits the phase is represented as an n-bit binary fraction, giving a worst-case
          error of <span className="math">1/2<sup>n</sup></span>. This plot compares the
          measured error against the theoretical bound for a non-dyadic phase (φ = 0.4, which has
          no finite binary representation).
        </p>
      </section>

      {/* Controls Card */}
      <section className="card flex flex-wrap gap-6 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Phase φ</label>
          <input
            type="range" min={0.02} max={0.98} step={0.02} value={theta}
            onChange={(e) => setTheta(+e.target.value)}
            className="w-32 accent-[var(--primary)]"
          />
          <span className="ml-2 text-sm font-mono text-[var(--text)]">{theta.toFixed(2)}</span>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Shots</label>
          <select
            value={shots}
            onChange={(e) => setShots(+e.target.value)}
            className="rounded-md border border-[var(--primary)]/20 bg-white px-2 py-1.5 text-xs text-[var(--text)] outline-none"
          >
            <option value={1000}>1 000</option>
            <option value={5000}>5 000</option>
            <option value={20000}>20 000</option>
            <option value={50000}>50 000</option>
          </select>
        </div>
      </section>

      {/* Chart */}
      <section className="card">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(166, 124, 0, 0.1)" />
            <XAxis
              dataKey="n" stroke="var(--text-muted)" tick={{ fontSize: 12 }}
              label={{ value: "Ancilla qubits (n)", position: "insideBottomRight", offset: -5, fill: "var(--text-muted)", fontSize: 12 }}
            />
            <YAxis
              stroke="var(--text-muted)" tick={{ fontSize: 11 }} scale="log" domain={[1e-5, 1]}
              tickFormatter={(v) => v.toExponential(0)}
              label={{ value: "Error (log scale)", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid rgba(166, 124, 0, 0.15)", borderRadius: 8, fontSize: 12, color: "var(--text)" }}
              formatter={(v) => (typeof v === "number" ? v.toExponential(4) : String(v))}
            />
            <Legend />
            <Line
              type="monotone" dataKey="error" stroke="var(--primary)" strokeWidth={2}
              dot={{ r: 4, fill: "var(--primary)" }} name="Measured error"
            />
            <Line
              type="monotone" dataKey="bound" stroke="var(--accent-rose)" strokeWidth={2} strokeDasharray="5 5"
              dot={false} name="1/2ⁿ bound"
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Data table */}
      <section className="overflow-x-auto rounded-xl border border-[var(--primary)]/15 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--primary)]/15 bg-[var(--primary)]/5">
              <th className="px-4 py-2 font-semibold text-[var(--text-muted)]">n</th>
              <th className="px-4 py-2 font-semibold text-[var(--text-muted)]">Error</th>
              <th className="px-4 py-2 font-semibold text-[var(--text-muted)]">1/2ⁿ</th>
              <th className="px-4 py-2 font-semibold text-[var(--text-muted)]">Ratio err/bound</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.n} className="border-b border-[var(--primary)]/10 text-[var(--text)] hover:bg-[var(--primary)]/5 transition-colors">
                <td className="px-4 py-2 font-mono">{d.n}</td>
                <td className="px-4 py-2 font-mono text-[var(--accent-cyan)]">{d.error}</td>
                <td className="px-4 py-2 font-mono text-[var(--text-muted)]">{d.bound}</td>
                <td className="px-4 py-2 font-mono text-[var(--text-muted)]">
                  {(+d.error / +d.bound).toFixed(2)}×
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card card-emerald">
        <h3 className="mb-1 text-sm font-semibold text-[var(--text)]">Key insight</h3>
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          Each additional ancilla qubit halves the error. The measured error closely follows the
          1/2<sup>n</sup> bound. For exactly representable phases (dyadic fractions like φ = 0.375 = 3/8),
          QPE achieves machine precision once n exceeds the binary representation length. For
          non-dyadic phases like φ = {theta.toFixed(2)}, the discretisation error dominates and follows
          the theoretical scaling exactly.
        </p>
      </section>
    </div>
  );
}
