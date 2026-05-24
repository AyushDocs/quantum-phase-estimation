"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const ALL_SHOTS = 20000;

function simulatePhaseQPE(thetaRad: number, n: number): { phase: number; counts: Record<string, number> } {
  const truePhase = (thetaRad % (2 * Math.PI)) / (2 * Math.PI);
  const counts: Record<string, number> = {};
  for (let i = 0; i < (1 << n); i++) {
    counts[i.toString(2).padStart(n, "0")] = 0;
  }
  for (let s = 0; s < ALL_SHOTS; s++) {
    let est = 0;
    for (let j = 0; j < n; j++) {
      const bit = Math.random() < Math.cos(Math.PI * (2 ** j * truePhase - Math.floor(2 ** j * truePhase))) ** 2 ? 0 : 1;
      est += bit * (1 << (n - 1 - j));
    }
    const key = est.toString(2).padStart(n, "0");
    counts[key] = (counts[key] ?? 0) + 1;
  }
  let phaseEst = 0;
  let total = 0;
  for (const [bits, c] of Object.entries(counts)) {
    const frac = bits.split("").reduce((acc, b, i) => acc + parseInt(b) / (1 << (i + 1)), 0);
    phaseEst += frac * c;
    total += c;
  }
  phaseEst /= total;
  return { phase: phaseEst, counts };
}

export default function PhaseGatePage() {
  const [n, setN] = useState(6);
  const [theta, setTheta] = useState(0.4);
  const thetaRad = theta * 2 * Math.PI;

  const { phase: est, counts } = simulatePhaseQPE(thetaRad, n);
  const truePhase = (thetaRad % (2 * Math.PI)) / (2 * Math.PI);
  const error = Math.min(Math.abs(est - truePhase), 1 - Math.abs(est - truePhase));

  const chartData = Object.entries(counts)
    .map(([bits, c]) => {
      const phase = bits.split("").reduce((acc, b, i) => acc + parseInt(b) / (1 << (i + 1)), 0);
      return { phase: +phase.toFixed(6), prob: c / ALL_SHOTS };
    })
    .sort((a, b) => a.phase - b.phase);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-2 text-2xl font-bold">
          <span className="gradient-text">1. Phase Gate QPE</span>
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          We apply QPE to the unitary <span className="math">U = P(θ)</span> using
          eigenstate <span className="math">|1⟩</span> (eigenvalue <span className="math">e^(iθ)</span>).
          The phase <span className="math">φ = θ/(2π)</span> is read out as an n-bit binary fraction from the ancilla
          measurement.
        </p>
      </section>

      {/* Circuit diagram */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">Circuit (Qiskit generated)</h2>
        <div className="card overflow-x-auto flex justify-center p-4">
          <img
            src="/qpe_circuit_n4.png"
            alt="Qiskit generated 4-ancilla QPE circuit diagram"
            className="max-h-64 object-contain rounded-lg border border-[var(--primary)]/15 bg-white p-2"
          />
        </div>
      </section>

      {/* Controls */}
      <section className="card flex flex-wrap gap-6 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Ancilla qubits (n)</label>
          <input
            type="range" min={2} max={10} value={n}
            onChange={(e) => setN(+e.target.value)}
            className="w-40 accent-[var(--primary)] text-[var(--primary)]"
          />
          <span className="ml-2 text-sm font-mono text-[var(--text)]">{n}</span>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Phase φ = θ/2π</label>
          <input
            type="range" min={0.01} max={0.99} step={0.01} value={theta}
            onChange={(e) => setTheta(+e.target.value)}
            className="w-40 accent-[var(--primary)] text-[var(--primary)]"
          />
          <span className="ml-2 text-sm font-mono text-[var(--text)]">{theta.toFixed(2)}</span>
        </div>
      </section>

      {/* Results */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card card-cyan">
          <div className="text-xs text-[var(--text-muted)]">True phase φ</div>
          <div className="text-xl font-bold text-[var(--accent-cyan)]">{truePhase.toFixed(6)}</div>
        </div>
        <div className="card card-emerald">
          <div className="text-xs text-[var(--text-muted)]">Estimated φ</div>
          <div className="text-xl font-bold text-[var(--accent-emerald)]">{est.toFixed(6)}</div>
        </div>
        <div className="card card-rose">
          <div className="text-xs text-[var(--text-muted)]">Error</div>
          <div className="text-xl font-bold text-[var(--accent-rose)]">{error.toExponential(3)}</div>
        </div>
      </section>

      {/* Chart */}
      <section className="card">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">Measurement distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(166, 124, 0, 0.1)" />
            <XAxis
              dataKey="phase" stroke="var(--text-muted)" tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.toFixed(3)}
            />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid rgba(166, 124, 0, 0.15)", borderRadius: 8, fontSize: 12, color: "var(--text)" }}
              labelFormatter={(v) => `φ = ${(+v).toFixed(4)}`}
            />
            <Bar dataKey="prob" fill="var(--primary)" radius={[2, 2, 0, 0]} />
            <ReferenceLine x={truePhase} stroke="var(--accent-rose)" strokeWidth={2} strokeDasharray="4 4"
              label={{ value: "true φ", position: "top", fill: "var(--accent-rose)", fontSize: 11 }}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Red dashed line = true phase. With {n} ancilla qubits there are {1 << n} possible outcomes.
        </p>
      </section>
    </div>
  );
}
