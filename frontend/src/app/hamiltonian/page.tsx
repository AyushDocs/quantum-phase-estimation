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

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-2 text-2xl font-bold">
          <span className="gradient-text">2. Hamiltonian Eigenvalue Estimation</span>
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          We scale QPE up to a 2-qubit system. The Hamiltonian is{" "}
          <span className="math">H = 0.5 Z⊗Z + 0.3 Z⊗I</span>, which has four eigenvalues:
          {" "}±0.8 and ±0.2. We prepare each eigenstate, simulate{" "}
          <span className="math">U = exp(−iHt)</span> using a diagonal gate, and run QPE to recover
          the eigenvalue.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">Eigenvalue table</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--primary)]/15 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--primary)]/15 bg-[var(--primary)]/5">
                <th className="px-4 py-2.5 font-semibold text-[var(--text-muted)]">State</th>
                <th className="px-4 py-2.5 font-semibold text-[var(--text-muted)]">True λ</th>
                <th className="px-4 py-2.5 font-semibold text-[var(--text-muted)]">Estimated λ</th>
                <th className="px-4 py-2.5 font-semibold text-[var(--text-muted)]">Error</th>
                <th className="px-4 py-2.5 font-semibold text-[var(--text-muted)]">Phase φ</th>
              </tr>
            </thead>
            <tbody>
              {HAM_EIGVALS.map((val, i) => {
                const r = simulateHamQPE(t, n, i);
                const truePhase = ((-val * t) / (2 * Math.PI)) % 1.0;
                const phaseStr = (truePhase >= 0 ? truePhase : 1 + truePhase).toFixed(4);
                return (
                  <tr
                    key={i}
                    className={`border-b border-[var(--primary)]/10 text-[var(--text)] transition-colors ${
                      i === state ? "bg-[var(--primary)]/10 font-semibold" : "hover:bg-[var(--primary)]/5"
                    }`}
                  >
                    <td className="px-4 py-2 font-mono">{STATE_LABELS[i]}</td>
                    <td className="px-4 py-2">{val.toFixed(2)}</td>
                    <td className="px-4 py-2 font-mono text-[var(--accent-cyan)]">{r.est.toFixed(6)}</td>
                    <td className="px-4 py-2 font-mono text-[var(--accent-rose)]">{r.error.toExponential(3)}</td>
                    <td className="px-4 py-2 font-mono text-[var(--text-muted)]">{phaseStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Controls Card */}
      <section className="card flex flex-wrap items-end gap-6 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Ancilla qubits</label>
          <input
            type="range" min={3} max={12} value={n}
            onChange={(e) => setN(+e.target.value)}
            className="w-40 accent-[var(--primary)]"
          />
          <span className="ml-2 text-sm font-mono text-[var(--text)]">{n}</span>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Eigenstate</label>
          <div className="flex gap-1.5">
            {STATE_LABELS.map((l, i) => (
              <button
                key={i}
                onClick={() => setState(i)}
                className={`rounded-md px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                  i === state
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "bg-white border border-[var(--primary)]/20 text-[var(--text-muted)] hover:bg-[var(--primary)]/10 hover:text-[var(--text)]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-[var(--text-muted)]">Selected: {STATE_LABELS[state]}</div>
          <div className="text-lg font-bold text-[var(--accent-emerald)]">
            λ ≈ {est.toFixed(5)} &nbsp;
            <span className="text-xs font-normal text-[var(--text-muted)]">
              (true: {trueVal.toFixed(2)}, err: {error.toExponential(3)})
            </span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">How the circuit works</h3>
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          The time evolution U = exp(−iHt) is diagonal in the computational basis (H is a sum of
          Z⊗Z and Z⊗I terms). We construct U as a <code className="text-[var(--accent-cyan)] font-semibold">DiagonalGate</code> whose
          entries are exp(−iλt) for each eigenvalue λ. For each ancilla j, we apply the
          controlled-U<sup>2<sup>j</sup></sup> gate, raising the diagonal entries to the power 2<sup>j</sup>.
          After the inverse QFT, the ancilla measurement yields the phase φ = −λt/(2π) mod 1,
          from which we recover λ.
        </p>
      </section>
    </div>
  );
}
