"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/", icon: "📊", label: "Dashboard" },
  { href: "/inventario", icon: "📦", label: "Inventario" },
  { href: "/ventas", icon: "💳", label: "Ventas" },
  { href: "/flujo-caja", icon: "💰", label: "Flujo de Caja" },
  { href: "/cartas", icon: "🔍", label: "Buscar Cartas" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><img src="/favicon.ico" alt="Logo" width={32} height={32}/></div>
        <div style={{ color: "white" }}>
          <h2>Pug House</h2>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Gestión</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
