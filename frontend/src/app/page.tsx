import Link from "next/link";

const sections = [
  {
    title: "Phase Gate QPE",
    desc: "Estimate the phase of a single-qubit unitary P(θ) using the textbook QPE algorithm with n ancilla qubits.",
    href: "/phase-gate",
    color: "card-amber",
  },
  {
    title: "2-Qubit Hamiltonian",
    desc: "Scale up: estimate eigenvalues of H = 0.5 Z⊗Z + 0.3 Z⊗I by simulating time evolution U = exp(−iHt) and running QPE on each eigenstate.",
    href: "/hamiltonian",
    color: "card-emerald",
  },
  {
    title: "Precision Scaling",
    desc: "Measure how the phase estimation error drops as we add more ancilla qubits. The error scales as ≈ 1/2ⁿ.",
    href: "/precision",
    color: "card-cyan",
  },
  {
    title: "Noise Comparison",
    desc: "Compare ideal-simulator QPE against a hardware-like noise model with depolarising errors and readout noise.",
    href: "/noise",
    color: "card-rose",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-12 bg-[var(--bg-dark)] text-[var(--text)] min-h-screen">
      {/* Hero */}
      <section className="text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">
          <span className="gradient-text">Quantum Phase Estimation</span>
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
          Quantum Phase Estimation (QPE) is a foundational quantum algorithm that estimates the
          eigenvalue of a unitary operator. It is the core subroutine behind <strong className="text-[var(--text)]">Shor&apos;s
          factoring algorithm</strong> and <strong className="text-[var(--text)]">quantum chemistry</strong> simulations.
          This interactive guide walks through four experiments — from a simple phase gate to noisy
          hardware simulation.
        </p>
      </section>

      {/* The algorithm */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-muted)]">How QPE works</h2>
        <div className="card mb-6">
          <p className="mb-3 text-sm leading-relaxed text-[var(--text-muted)]">
            Given a unitary U with eigenvector |ψ⟩ and eigenvalue e<sup>2πiφ</sup>, QPE estimates
            φ using n ancilla qubits:
          </p>
          <ol className="ml-5 list-decimal space-y-1.5 text-sm text-[var(--text-muted)]">
            <li>Prepare n ancillas in |0⟩<sup>⊗n</sup> and apply H<sup>⊗n</sup> to create a uniform superposition.</li>
            <li>Apply controlled-U<sup>2<sup>j</sup></sup> operations, writing the phase onto ancillas.</li>
            <li>Apply the inverse Quantum Fourier Transform (QFT<sup>†</sup>) to extract the phase.</li>
            <li>Measure the ancillas — the n-bit string is the binary fraction of φ.</li>
          </ol>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--text-muted)]">
            Precision is determined by the number of ancilla qubits: n bits give φ to within ≈ 1/2<sup>n</sup>.
            In practice, hardware noise degrades this precision, and non-exactly-representable phases
            introduce discretisation error.
          </p>
        </div>
      </section>

      {/* Experiment cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-muted)]">Experiments</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className={`card ${s.color} group block`}>
              <h3 className="mb-1.5 text-base font-semibold text-[var(--text)] group-hover:text-[var(--primary)]">
                {s.title}
              </h3>
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
