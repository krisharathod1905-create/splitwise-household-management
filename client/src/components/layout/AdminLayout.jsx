import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FiGrid, FiMapPin, FiUsers, FiBarChart2, FiFileText, FiLogOut } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const navItems = [
  { href: "/admin", icon: FiGrid, label: "Overview" },
  { href: "/admin/offices", icon: FiMapPin, label: "Offices" },
  { href: "/admin/staff", icon: FiUsers, label: "Staff" },
  { href: "/admin/analytics", icon: FiBarChart2, label: "Analytics" },
  { href: "/admin/audit", icon: FiFileText, label: "Audit Logs" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate("/"); toast.success("Logged out."); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>
      <aside style={{
        width: "240px", flexShrink: 0,
        background: "var(--color-navy)", display: "flex", flexDirection: "column", padding: "1.5rem",
      }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
            <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, var(--color-blue), var(--color-teal))", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "16px" }}>Q</div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "white" }}>QueueLess</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "10px", padding: "0.875rem" }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>Administrator</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "white", fontSize: "0.9rem" }}>{user?.fullName}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-teal-light)", marginTop: "2px" }}>Admin Portal</div>
          </div>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.href} to={item.href} end={item.href === "/admin"}
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.75rem 0.875rem", borderRadius: "8px",
                  textDecoration: "none", fontSize: "0.875rem",
                  fontFamily: "var(--font-display)", fontWeight: isActive ? 600 : 500,
                  background: isActive ? "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(13,148,136,0.2))" : "transparent",
                  color: isActive ? "white" : "rgba(255,255,255,0.6)",
                  borderLeft: isActive ? "3px solid var(--color-teal)" : "3px solid transparent",
                  transition: "all 0.2s ease",
                })}>
                <Icon size={16} /> {item.label}
              </NavLink>
            );
          })}
        </nav>
        <button onClick={handleLogout}
          style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "8px", cursor: "pointer", color: "rgba(220,38,38,0.8)", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", padding: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 500 }}>
          <FiLogOut size={16} /> Sign Out
        </button>
      </aside>
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto", minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
