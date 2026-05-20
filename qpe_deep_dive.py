"""
Quantum Phase Estimation Deep Dive
===================================
1. QPE on a single-qubit phase gate P(θ)
2. Scale up: 2-qubit Hamiltonian eigenvalue estimation
3. Precision scaling with ancilla count → graph
4. Simulator vs hardware noise comparison
"""

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams

from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import QFTGate, DiagonalGate
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError


# ─────────────────────────────────────────────────────────────────
# PART 1 — QPE on a single-qubit phase gate
# ─────────────────────────────────────────────────────────────────

def qpe_phase_gate(theta, num_ancilla):
    n = num_ancilla
    qc = QuantumCircuit(n + 1, n)
    target = n            # last qubit
    ancillas = list(range(n))

    qc.x(target)          # eigenstate |1>  →  P(θ)|1> = e^{iθ}|1>

    qc.h(ancillas)

    for j in range(n):
        qc.cp(2**j * theta, ancillas[j], target)

    qc.compose(QFTGate(n).inverse(), ancillas, inplace=True)
    qc.measure(ancillas, list(range(n)))
    return qc


SIM = AerSimulator()

def _run(qc, shots, sim=None):
    qct = transpile(qc, sim or SIM)
    return (sim or SIM).run(qct, shots=shots).result().get_counts()


def run_qpe_phase(theta, num_ancilla, shots=20000):
    qc = qpe_phase_gate(theta, num_ancilla)
    counts = _run(qc, shots)
    total = sum(counts.values())

    phase_est = 0.0
    for bits, c in counts.items():
        frac = sum(int(bits[i]) / (1 << (i + 1)) for i in range(len(bits)))
        phase_est += frac * c / total

    true_phase = (theta % (2 * np.pi)) / (2 * np.pi)
    raw_err = abs(phase_est - true_phase)
    error = min(raw_err, 1.0 - raw_err)
    return phase_est, true_phase, error, counts


# ─────────────────────────────────────────────────────────────────
# PART 2 — 2-qubit Hamiltonian eigenvalue estimation
# ─────────────────────────────────────────────────────────────────

# H = 0.5 * Z⊗Z + 0.3 * Z⊗I
# Qiskit uses little-endian: index = sum(bit_i * 2^i)
# index 0: |q0=0,q1=0⟩ = |00⟩ → 0.8
# index 1: |q0=1,q1=0⟩ = |10⟩ → -0.8
# index 2: |q0=0,q1=1⟩ = |01⟩ → -0.2
# index 3: |q0=1,q1=1⟩ = |11⟩ → 0.2
HAM_EIGVALS = np.array([0.8, -0.8, -0.2, 0.2])


def time_evolve(t, power=1):
    """Diagonal entries of exp(-i H * t * power)."""
    return np.exp(-1j * HAM_EIGVALS * t * power)


def qpe_hamiltonian(t, num_ancilla, eigenstate=0):
    n = num_ancilla
    qc = QuantumCircuit(n + 2, n)
    target = [n, n + 1]
    ancillas = list(range(n))

    for i in range(2):
        if (eigenstate >> i) & 1:
            qc.x(target[i])

    qc.h(ancillas)

    for j in range(n):
        diag = time_evolve(t, 2**j).tolist()
        gate = DiagonalGate(diag)
        cgate = gate.control(1)
        qc.append(cgate, [ancillas[j]] + target)

    qc.compose(QFTGate(n).inverse(), ancillas, inplace=True)
    qc.measure(ancillas, list(range(n)))
    return qc


def run_qpe_ham(t, num_ancilla, eigenstate=0, shots=20000):
    qc = qpe_hamiltonian(t, num_ancilla, eigenstate)
    counts = _run(qc, shots)
    total = sum(counts.values())

    phase_est = 0.0
    for bits, c in counts.items():
        frac = sum(int(bits[i]) / (1 << (i + 1)) for i in range(len(bits)))
        phase_est += frac * c / total

    true_val = HAM_EIGVALS[eigenstate]
    # φ = -λt/(2π) mod 1   (since U|ψ⟩ = e^{-iHt}|ψ⟩ = e^{2πiφ}|ψ⟩)
    true_phase = (-true_val * t / (2 * np.pi)) % 1.0
    raw_err = abs(phase_est - true_phase)
    phase_err = min(raw_err, 1.0 - raw_err)
    # λ = -2π(φ + k)/t   →  pick k so λ is in eigenvalue range [-0.8, 0.8]
    period = 2 * np.pi / t                        # = 4 for t = π/2
    eig_est = -2 * np.pi * phase_est / t
    while eig_est < min(HAM_EIGVALS) - 0.1:
        eig_est += period
    while eig_est > max(HAM_EIGVALS) + 0.1:
        eig_est -= period
    eig_err = abs(eig_est - true_val)
    return eig_est, true_val, eig_err, counts


# ─────────────────────────────────────────────────────────────────
# PART 3 — Precision scaling with ancilla count
# ─────────────────────────────────────────────────────────────────

def sweep_precision(theta, max_n=12, shots=20000):
    ns = list(range(1, max_n + 1))
    errs = []
    ests = []
    for n in ns:
        est, true, err, _ = run_qpe_phase(theta, n, shots)
        errs.append(err)
        ests.append(est)
    return ns, errs, ests


def plot_precision(ns, errs, true_phase, save="precision_scaling.png"):
    rcParams.update({"font.family": "serif", "font.size": 12})
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    bound = [1.0 / (1 << n) for n in ns]

    ax1.semilogy(ns, errs, "bo-", ms=6, label="QPE error")
    ax1.semilogy(ns, bound, "r--", lw=2, label=r"$1/2^n$ bound")
    ax1.set_xlabel("Ancilla qubits $n$")
    ax1.set_ylabel("Phase estimation error")
    ax1.set_title("QPE precision scaling")
    ax1.legend()
    ax1.grid(alpha=0.3)

    ax2.semilogy(ns, errs, "bo-", ms=6)
    ax2.semilogy(ns, bound, "r--", lw=2, label=r"$1/2^n$")
    ax2.set_xlabel("Ancilla qubits $n$")
    ax2.set_ylabel("Error (log scale)")
    ax2.set_title(f"True phase = {true_phase:.4f}")
    ax2.legend()
    ax2.grid(alpha=0.3)

    plt.tight_layout()
    plt.savefig(save, dpi=150)
    print(f"  → {save}")
    plt.close()


def plot_counts(counts, true_phase, n, save="counts_distribution.png"):
    rcParams.update({"font.family": "serif", "font.size": 12})
    labels = sorted(counts.keys())
    vals = [counts[k] for k in labels]
    total = sum(vals)
    phases = [sum(int(l[i]) / (1 << (i + 1)) for i in range(len(l))) for l in labels]

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar(phases, [v / total for v in vals],
           width=1.0 / (1 << n) * 0.8, alpha=0.7,
           color="steelblue", edgecolor="navy")
    ax.axvline(true_phase, color="red", ls="--", lw=2,
               label=f"True φ = {true_phase:.4f}")
    ax.set_xlabel("Estimated phase (binary fraction)")
    ax.set_ylabel("Probability")
    ax.set_title(f"QPE outcome distribution  (n={n})")
    ax.legend()
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(save, dpi=150)
    print(f"  → {save}")
    plt.close()


def plot_circuit(qc, save="circuit.png"):
    fig = qc.draw("mpl", fold=-1)
    fig.savefig(save, dpi=150)
    print(f"  → {save}")
    plt.close(fig)


# ─────────────────────────────────────────────────────────────────
# PART 4 — Simulator vs hardware noise
# ─────────────────────────────────────────────────────────────────

def build_noise(p_depol_1q=1e-4, p_depol_2q=1e-3):
    model = NoiseModel()
    model.add_all_qubit_quantum_error(
        depolarizing_error(p_depol_1q, 1), ["u1", "u2", "u3", "h", "x", "p"]
    )
    model.add_all_qubit_quantum_error(
        depolarizing_error(p_depol_2q, 2), ["cp", "cx", "cz"]
    )
    model.add_all_qubit_readout_error(
        ReadoutError([[0.98, 0.02], [0.02, 0.98]])
    )
    return model


def run_qpe_noisy(theta, num_ancilla, noise_model=None, shots=20000):
    qc = qpe_phase_gate(theta, num_ancilla)
    sim = AerSimulator(noise_model=noise_model) if noise_model else SIM
    counts = _run(qc, shots, sim)
    total = sum(counts.values())
    phase_est = 0.0
    for bits, c in counts.items():
        frac = sum(int(bits[i]) / (1 << (i + 1)) for i in range(len(bits)))
        phase_est += frac * c / total
    true_phase = (theta % (2 * np.pi)) / (2 * np.pi)
    raw_err = abs(phase_est - true_phase)
    error = min(raw_err, 1.0 - raw_err)
    return phase_est, error, counts


def sweep_noise(theta, num_ancilla, rates, shots=10000):
    _, ideal_err, _ = run_qpe_noisy(theta, num_ancilla, shots=shots)[:3]
    noisy_errs = []
    for r in rates:
        _, err, _ = run_qpe_noisy(theta, num_ancilla, build_noise(r, r * 10), shots)
        noisy_errs.append(err)
    return rates, noisy_errs, ideal_err


def plot_noise(rates, noisy_errs, ideal_err, save="noise_comparison.png"):
    rcParams.update({"font.family": "serif", "font.size": 12})
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.semilogy(rates, noisy_errs, "ro-", ms=7, label="With hardware-like noise")
    ax.axhline(ideal_err, color="b", ls="--", lw=2, label="Ideal simulator")
    ax.set_xlabel("1-qubit depolarising rate")
    ax.set_ylabel("Phase estimation error")
    ax.set_title("QPE: ideal simulator vs noisy hardware model")
    ax.legend()
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(save, dpi=150)
    print(f"  → {save}")
    plt.close()


# ─────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────

def main():
    print("=" * 68)
    print("  QUANTUM PHASE ESTIMATION  —  Deep Dive")
    print("=" * 68)

    THETA = 2 * np.pi * 0.4                 # φ = 0.4 (non-dyadic → more interesting precision plot)
    SHOTS = 20000

    # ── Part 1: Phase gate QPE ────────────────────────────────
    print("\n" + "─" * 68)
    print("  PART 1  —  QPE on single-qubit phase gate  P(θ)")
    print("─" * 68)

    qc_small = qpe_phase_gate(THETA, 4)
    print(f"  Circuit depth   = {qc_small.depth()}")
    print(f"  Gates           = {qc_small.size()}")

    # 8-ancilla run for high precision
    n8 = 8
    est, true, err, counts8 = run_qpe_phase(THETA, n8, SHOTS)
    print(f"\n  θ = {THETA:.6f}  →  φ_true = {true:.6f}")
    print(f"  φ_est (n={n8})  = {est:.6f}     error = {err:.2e}")
    plot_counts(counts8, true, n8, "qpe_counts_n8.png")

    # ── Part 2: Hamiltonian ───────────────────────────────────
    print("\n" + "─" * 68)
    print("  PART 2  —  2-qubit Hamiltonian eigenvalue estimation")
    print("─" * 68)

    t = np.pi / 2
    print(f"  H = 0.5 Z⊗Z + 0.3 Z⊗I")
    print(f"  True eigenvalues:  {HAM_EIGVALS}")
    print(f"  Time evolution:    U = exp(-i H t),  t = {t:.4f}")

    n_ham = 8
    print(f"\n  {'State':>6} | {'True λ':>8} | {'Est λ':>10} | {'Error':>10}")
    print(f"  {'──────':>6}-├{'─'*8}-├{'─'*10}-├{'─'*10}")
    for state in range(4):
        eig_est, eig_true, eig_err, _ = run_qpe_ham(t, n_ham, state, SHOTS)
        print(f"  |{state:02b}⟩   | {eig_true:+8.2f} | {eig_est:+10.6f} | {eig_err:10.2e}")

    # ── Part 3: Precision scaling ─────────────────────────────
    print("\n" + "─" * 68)
    print("  PART 3  —  Precision vs number of ancilla qubits")
    print("─" * 68)

    ns, errs, ests = sweep_precision(THETA, 10, SHOTS)
    print(f"  {'n':>3} | {'Error':>12} | {'1/2ⁿ':>10} | {'Est φ':>10}")
    print(f"  {'───':>3}-├{'─'*12}-├{'─'*10}-├{'─'*10}")
    for n, e, ph in zip(ns, errs, ests):
        print(f"  {n:3d} | {e:12.2e} | {1/(1<<n):10.2e} | {ph:10.6f}")
    plot_precision(ns, errs, true, "precision_scaling.png")

    # ── Part 4: Noise ─────────────────────────────────────────
    print("\n" + "─" * 68)
    print("  PART 4  —  Simulator vs hardware noise")
    print("─" * 68)

    rates = [1e-5, 5e-5, 1e-4, 5e-4, 1e-3, 5e-3, 1e-2]
    r_vals, n_errs, ideal = sweep_noise(THETA, 6, rates, 10000)

    print(f"  {'1Q depol rate':>16} | {'Error':>12}")
    print(f"  {'─'*16}-├{'─'*12}")
    print(f"  {'Ideal':>16} | {ideal:12.2e}")
    for r, e in zip(r_vals, n_errs):
        print(f"  {r:16.2e} | {e:12.2e}")
    plot_noise(r_vals, n_errs, ideal, "noise_comparison.png")

    # ── Circuit diagram for documentation ─────────────────────
    plot_circuit(qpe_phase_gate(THETA, 4), "qpe_circuit_n4.png")

    print("\n" + "=" * 68)
    print("  Done  —  All results and plots generated.")
    print("=" * 68)


if __name__ == "__main__":
    main()
