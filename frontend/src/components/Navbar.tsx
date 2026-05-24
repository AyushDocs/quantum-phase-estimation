"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/phase-gate", label: "Phase Gate" },
  { href: "/hamiltonian", label: "Hamiltonian" },
  { href: "/precision", label: "Precision" },
  { href: "/noise", label: "Noise" },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--primary)]/15 bg-[var(--bg-dark)]/85 backdrop-blur-md py-3">
      <div className="mx-auto flex flex-col sm:flex-row gap-3 sm:gap-6 items-center justify-between px-4 max-w-5xl">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold justify-center sm:justify-start">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] text-xs font-bold text-white">
            QPE
          </span>
          <span className="text-[var(--text)]">Quantum Phase Estimation</span>
        </Link>

        <div className="flex flex-wrap justify-center gap-1">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:bg-[var(--primary)]/10 hover:text-[var(--text)]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
