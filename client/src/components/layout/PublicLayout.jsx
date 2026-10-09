import { useState } from "react";
import { Link, NavLink, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiUser, FiLogIn } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/offices", label: "Offices" },
];

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Navigation */}
      <nav style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div className="page-container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
            {/* Logo */}
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
              <div style={{
                width: "36px", height: "36px",
                background: "linear-gradient(135deg, var(--color-blue) 0%, var(--color-teal) 100%)",
                borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 800, fontSize: "18px",
                fontFamily: "var(--font-display)"
              }}>Q</div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "var(--color-navy)" }}>
                Queue<span style={{ color: "var(--color-teal)" }}>Less</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="hidden-mobile">
              {navLinks.map((link) => (
                <NavLink key={link.href} to={link.href}
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                  end={link.href === "/"}>
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Auth buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }} className="hidden-mobile">
              {isAuthenticated ? (
                <button className="btn btn-primary btn-sm"
                  onClick={() => navigate(user?.role === "admin" ? "/admin" : user?.role === "staff" ? "/staff" : "/dashboard")}>
                  <FiUser size={14} /> Dashboard
                </button>
              ) : (
                <>
                  <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
                  <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
                </>
              )}
            </div>

            {/* Mobile burger */}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-navy)", padding: "0.5rem" }}
              className="show-mobile">
              {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: "white",
                borderTop: "1px solid var(--color-border)",
                overflow: "hidden",
              }}>
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {navLinks.map((link) => (
                  <NavLink key={link.href} to={link.href}
                    className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                    onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </NavLink>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {isAuthenticated ? (
                    <Link to="/dashboard" className="btn btn-primary" onClick={() => setMobileOpen(false)}>
                      <FiUser size={14} /> Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link to="/login" className="btn btn-secondary" onClick={() => setMobileOpen(false)}>Sign In</Link>
                      <Link to="/register" className="btn btn-primary" onClick={() => setMobileOpen(false)}>Get Started</Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Page Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{
        background: "var(--color-navy)",
        color: "rgba(255,255,255,0.7)",
        padding: "2rem 0",
        marginTop: "auto",
      }}>
        <div className="page-container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
                <div style={{
                  width: "28px", height: "28px",
                  background: "linear-gradient(135deg, var(--color-blue), var(--color-teal))",
                  borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 800, fontSize: "14px",
                }}>Q</div>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "white" }}>QueueLess</span>
              </div>
              <p style={{ fontSize: "0.8rem" }}>Your Time. Your Turn. No Lines.</p>
            </div>
            <div style={{ fontSize: "0.8rem", textAlign: "right" }}>
              <p>PS-02 Hackathon Project — Demo Application</p>
              <p>Not affiliated with any official government body.</p>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .hidden-mobile { display: flex !important; }
        .show-mobile { display: none !important; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
