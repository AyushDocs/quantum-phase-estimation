"use client";

import { useState } from "react";

const HAM_EIGVALS = [0.8, -0.8, -0.2, 0.2];
const STATE_LABELS = ["|00⟩", "|10⟩", "|01⟩", "|11⟩"];

function simulateHamQPE(t: number, n: number, eigenstate: number): { est: number; trueVal: number; error: number } {
  const trueVal = HAM_EIGVALS[eigenstate];
  const truePhase = ((-trueVal * t) / (2 * Math.PI)) % 1.0;
  const truePhaseNorm = ((truePhase % 1) + 1) % 1;

  const shots = 10000;
  const counts: Record<string, number> = {};
  for (let i = 0; i < 1 << n; i++) counts[i.toString(2).padStart(n, "0")] = 0;

  for (let s = 0; s < shots; s++) {
    let bitstring = "";
    for (let j = 0; j < n; j++) {
      const angle = Math.PI * (2 ** j * truePhaseNorm);
      const bit = Math.random() < Math.cos(angle) ** 2 ? 0 : 1;
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

  const period = (2 * Math.PI) / t;
  let eigEst = (-2 * Math.PI * phaseEst) / t;
  while (eigEst < Math.min(...HAM_EIGVALS) - 0.1) eigEst += period;
  while (eigEst > Math.max(...HAM_EIGVALS) + 0.1) eigEst -= period;

  return { est: eigEst, trueVal, error: Math.abs(eigEst - trueVal) };
}

export default function HamiltonianPage() {
  const [n, setN] = useState(7);
  const [state, setState] = useState(0);
  const t = Math.PI / 2;

  const { est, trueVal, error } = simulateHamQPE(t, n, state);

  const tableData = HAM_EIGVALS.map((_, i) => {
    const r = simulateHamQPE(t, n, i);
    return { state: STATE_LABELS[i], trueVal: r.trueVal.toFixed(2), est: r.est.toFixed(6), error: r.error.toExponential(3) };
  });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-2 text-2xl font-bold">
          <span className="gradient-text">2. Hamiltonian Eigenvalue Estimation</span>
        </h1>
        <p className="text-sm leading-relaxed text-slate-400">
          We scale QPE up to a 2-qubit system. The Hamiltonian is{" "}
          <span className="math">H = 0.5 Z⊗Z + 0.3 Z⊗I</span>, which has four eigenvalues:
          {" "}±0.8 and ±0.2. We prepare each eigenstate, simulate{" "}
          <span className="math">U = exp(−iHt)</span> using a diagonal gate, and run QPE to recover
          the eigenvalue.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-300">Eigenvalue table</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/50">
                <th className="px-4 py-2.5 font-medium text-slate-400">State</th>
                <th className="px-4 py-2.5 font-medium text-slate-400">True λ</th>
                <th className="px-4 py-2.5 font-medium text-slate-400">Estimated λ</th>
                <th className="px-4 py-2.5 font-medium text-slate-400">Error</th>
                <th className="px-4 py-2.5 font-medium text-slate-400">Phase φ</th>
              </tr>
            </thead>
            <tbody>
              {HAM_EIGVALS.map((val, i) => {
                const r = simulateHamQPE(t, n, i);
                const truePhase = ((-val * t) / (2 * Math.PI)) % 1.0;
                const phaseStr = (truePhase >= 0 ? truePhase : 1 + truePhase).toFixed(4);
                return (
                  <tr key={i} className={`border-b border-white/5 ${i === state ? "bg-indigo-500/10" : ""}`}>
                    <td className="px-4 py-2 font-mono">{STATE_LABELS[i]}</td>
                    <td className="px-4 py-2">{val.toFixed(2)}</td>
                    <td className="px-4 py-2 font-mono text-cyan-300">{r.est.toFixed(6)}</td>
                    <td className="px-4 py-2 font-mono text-rose-400">{r.error}</td>
                    <td className="px-4 py-2 font-mono text-slate-400">{phaseStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-wrap items-end gap-6 rounded-xl border border-white/10 bg-slate-900/50 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Ancilla qubits</label>
          <input type="range" min={3} max={12} value={n} onChange={(e) => setN(+e.target.value)}
            className="w-40 accent-indigo-500" />
          <span className="ml-2 text-sm font-mono text-slate-300">{n}</span>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Eigenstate</label>
          <div className="flex gap-1">
            {STATE_LABELS.map((l, i) => (
              <button key={i} onClick={() => setState(i)}
                className={`rounded-md px-3 py-1 text-xs font-mono transition-colors ${
                  i === state ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >{l}</button>
            ))}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Selected: {STATE_LABELS[state]}</div>
          <div className="text-lg font-bold text-emerald-400">
            λ ≈ {est.toFixed(5)} &nbsp;
            <span className="text-xs text-slate-500">(true: {trueVal.toFixed(2)}, err: {error.toExponential(3)})</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">How the circuit works</h3>
        <p className="text-xs leading-relaxed text-slate-400">
          The time evolution U = exp(−iHt) is diagonal in the computational basis (H is a sum of
          Z⊗Z and Z⊗I terms). We construct U as a <code className="text-cyan-400">DiagonalGate</code> whose
          entries are exp(−iλt) for each eigenvalue λ. For each ancilla j, we apply the
          controlled-U<sup>2<sup>j</sup></sup> gate, raising the diagonal entries to the power 2<sup>j</sup>.
          After the inverse QFT, the ancilla measurement yields the phase φ = −λt/(2π) mod 1,
          from which we recover λ.
        </p>
      </section>
    </div>
  );
}
