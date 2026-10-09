import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiHome, FiClock, FiList, FiBell, FiUser, FiLogOut, FiMenu, FiX,
  FiPlusCircle
} from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "@/lib/api";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", icon: FiHome, label: "Dashboard" },
  { href: "/book-token", icon: FiPlusCircle, label: "Book Token" },
  { href: "/history", icon: FiList, label: "History" },
  { href: "/notifications", icon: FiBell, label: "Notifications" },
  { href: "/profile", icon: FiUser, label: "Profile" },
];

export default function CitizenLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const res = await notificationApi.list({ limit: 1 });
      return res.data.data.unreadCount;
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifData || 0;

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      toast.success("Logged out successfully.");
    } catch {}
  };

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1.5rem" }}>
      {/* Logo */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px",
            background: "linear-gradient(135deg, var(--color-blue), var(--color-teal))",
            borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 800, fontSize: "16px",
          }}>Q</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--color-navy)" }}>
            Queue<span style={{ color: "var(--color-teal)" }}>Less</span>
          </span>
        </div>
      </div>

      {/* User info */}
      <div style={{
        background: "linear-gradient(135deg, var(--color-blue-50), var(--color-teal-50))",
        borderRadius: "var(--radius-lg)", padding: "0.875rem",
        marginBottom: "1.5rem",
      }}>
        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "2px" }}>Welcome back</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy)", fontSize: "0.95rem" }}>
          {user?.fullName?.split(" ")[0] || "Citizen"}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-blue)", marginTop: "2px" }}>Citizen</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isNotif = item.href === "/notifications";
          return (
            <NavLink key={item.href} to={item.href}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.625rem 0.875rem", borderRadius: "var(--radius-md)",
                textDecoration: "none", fontSize: "0.9rem",
                fontFamily: "var(--font-display)", fontWeight: 500,
                background: isActive ? "var(--color-blue-light)" : "transparent",
                color: isActive ? "var(--color-blue)" : "var(--color-navy-700)",
                fontWeight: isActive ? 600 : 500,
                transition: "all 0.2s ease",
                position: "relative",
              })}>
              <Icon size={18} />
              {item.label}
              {isNotif && unreadCount > 0 && (
                <span style={{
                  marginLeft: "auto", background: "var(--color-danger)",
                  color: "white", fontSize: "0.7rem", fontWeight: 700,
                  borderRadius: "999px", padding: "1px 6px", minWidth: "18px", textAlign: "center",
                }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <button onClick={handleLogout} className="btn btn-ghost btn-sm"
        style={{ justifyContent: "flex-start", gap: "0.75rem", marginTop: "1rem", color: "var(--color-danger)" }}>
        <FiLogOut size={16} /> Sign Out
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Desktop Sidebar */}
      <aside style={{
        width: "240px", flexShrink: 0,
        background: "white", borderRight: "1px solid var(--color-border)",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }} className="sidebar-desktop">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }}
              onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                position: "fixed", top: 0, left: 0, width: "280px", height: "100vh",
                background: "white", zIndex: 101, overflowY: "auto",
              }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Mobile header */}
        <header style={{
          background: "white", borderBottom: "1px solid var(--color-border)",
          padding: "0 1rem", height: "56px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 40,
        }} className="mobile-header">
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-navy)", padding: "4px" }}>
            <FiMenu size={22} />
          </button>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy)" }}>
            Queue<span style={{ color: "var(--color-teal)" }}>Less</span>
          </span>
          <NavLink to="/notifications" style={{ position: "relative", color: "var(--color-navy-700)", lineHeight: 1 }}>
            <FiBell size={22} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "var(--color-danger)", color: "white",
                fontSize: "0.65rem", fontWeight: 700, borderRadius: "999px",
                width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{unreadCount}</span>
            )}
          </NavLink>
        </header>

        <main style={{ flex: 1, padding: "1.5rem" }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .sidebar-desktop { display: block !important; }
        .mobile-header { display: none !important; }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-header { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
