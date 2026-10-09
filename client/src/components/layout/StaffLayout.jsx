import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FiMonitor, FiList, FiLogOut, FiLayers } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const navItems = [
  { href: "/staff", icon: FiMonitor, label: "Dashboard" },
  { href: "/staff/queue", icon: FiList, label: "Queue" },
  { href: "/staff/counter", icon: FiLayers, label: "Counter" },
];

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate("/"); toast.success("Logged out."); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0F172A" }}>
      <aside style={{
        width: "220px", flexShrink: 0, background: "#1E293B",
        display: "flex", flexDirection: "column", padding: "1.5rem",
      }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
            <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, var(--color-blue), var(--color-teal))", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800 }}>Q</div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "white" }}>QueueLess</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "8px", padding: "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>Staff Portal</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "white", fontSize: "0.9rem" }}>
              {user?.fullName?.split(" ")[0]}
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.href} to={item.href}
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.625rem 0.875rem", borderRadius: "8px",
                  textDecoration: "none", fontSize: "0.875rem",
                  fontFamily: "var(--font-display)", fontWeight: 500,
                  background: isActive ? "rgba(37,99,235,0.2)" : "transparent",
                  color: isActive ? "var(--color-blue-light)" : "rgba(255,255,255,0.7)",
                  transition: "all 0.2s ease",
                })}>
                <Icon size={16} /> {item.label}
              </NavLink>
            );
          })}
        </nav>
        <button onClick={handleLogout}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", padding: "0.5rem" }}>
          <FiLogOut size={16} /> Sign Out
        </button>
      </aside>
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
