import { motion, MotionConfig } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowRight } from "react-icons/fi";
import {
  HiOutlineArrowTrendingDown as TrendingDownIcon,
  HiOutlineBellAlert as AlertIcon,
  HiOutlineBolt as BoltIcon,
  HiOutlineBuildingLibrary as OfficeIcon,
  HiOutlineClock as ClockIcon,
  HiOutlineDevicePhoneMobile as MobileIcon,
  HiOutlineMapPin as LocationIcon,
  HiOutlineShieldCheck as ShieldIcon,
  HiOutlineTicket as TicketIcon,
  HiOutlineUserGroup as UsersIcon,
} from "react-icons/hi2";
import { officeApi } from "@/lib/api";

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Status badge colors ──────────────────────────────────────────────────────
const statusColors = {
  issued: "badge-blue",
  checked_in: "badge-info",
  called: "badge-warning",
  in_service: "badge-success",
  waiting: "badge-neutral",
};

// ─── Demo queue preview data (clearly labeled illustrative) ───────────────────
const demoQueueData = [
  { token: "DL-NEW-041", name: "Aarav S.", wait: "5 min", status: "called" },
  { token: "DL-NEW-042", name: "You", wait: "18 min", status: "issued", isYou: true },
  { token: "DL-NEW-043", name: "Priya P.", wait: "26 min", status: "issued" },
  { token: "DL-NEW-044", name: "Rohan M.", wait: "34 min", status: "issued" },
];

const steps = [
  { step: "01", icon: LocationIcon, title: "Choose Office", desc: "Browse nearby government offices and filter by department, city, or service type." },
  { step: "02", icon: MobileIcon, title: "Select Service", desc: "Pick the service you need and see real-time estimated waiting times before booking." },
  { step: "03", icon: TicketIcon, title: "Get Virtual Token", desc: "Receive your unique digital token instantly. Your place in the queue is reserved." },
  { step: "04", icon: AlertIcon, title: "Arrive When Notified", desc: "Track live updates and get alerted when your turn is approaching. No more waiting rooms." },
];

const features = [
  { icon: ClockIcon, title: "Smart Wait Predictions", desc: "Our AI-powered engine forecasts wait times using historical service data and live counter activity." },
  { icon: BoltIcon, title: "Real-Time Updates", desc: "Queue positions and predictions update instantly as citizens are served — no page refresh needed." },
  { icon: ShieldIcon, title: "Secure & Private", desc: "QR-verified check-in, encrypted tokens, and minimal data collection protect your information." },
  { icon: TrendingDownIcon, title: "Reduce Physical Wait", desc: "Citizens report saving 60–80% of time previously spent sitting in waiting rooms." },
  { icon: UsersIcon, title: "Walk-in Friendly", desc: "No smartphone? Walk-in tokens are issued by staff and join the same fair queue." },
  { icon: OfficeIcon, title: "Multi-Office Support", desc: "Works across passport offices, RTOs, municipal corporations, and revenue departments." },
];

const faqs = [
  { q: "Is QueueLess free to use?", a: "Yes, completely free for citizens. Government offices pay for the platform as a service." },
  { q: "What if I don't have a smartphone?", a: "Staff at the office can issue a walk-in token for you, which joins the same digital queue." },
  { q: "How accurate are the wait-time predictions?", a: "Predictions are based on historical service durations and live counter data. They are estimates — actual wait may vary by ±5–10 minutes." },
  { q: "Can I cancel my token?", a: "Yes, you can cancel anytime before being called. Cancelled tokens free your spot for others." },
  { q: "What happens if I arrive late?", a: "You receive check-in reminders as your turn approaches. There is a configurable grace period; after that your token may be marked missed." },
];

export default function LandingPage() {
  const { data: officesData } = useQuery({
    queryKey: ["offices-landing"],
    queryFn: () => officeApi.list({ limit: 6, status: "active" }),
    select: (res) => res.data.data.offices,
  });

  const offices = officesData || [];

  return (
    <MotionConfig reducedMotion="user">
    <div>
      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0D3660 100%)",
        position: "relative", overflow: "hidden",
        padding: "5rem 0 4rem",
      }}>
        {/* Ambient orbs */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
          position: "absolute", top: "-100px", right: "-100px",
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(13,148,136,0.2) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{
          position: "absolute", bottom: "-50px", left: "10%",
          width: "300px", height: "300px",
          background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />

        <div className="page-container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
            {/* Left: copy */}
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  background: "rgba(13,148,136,0.15)", border: "1px solid rgba(13,148,136,0.3)",
                  color: "#5EEAD4", borderRadius: "999px",
                  padding: "0.25rem 0.875rem", fontSize: "0.8rem", fontWeight: 600,
                  marginBottom: "1.5rem",
                }}>
                  <span className="status-dot live" style={{ background: "#22d3ee" }} />
                  PS-02 Government Queue Management
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp}
                style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", fontWeight: 800, color: "white", lineHeight: 1.15, marginBottom: "1.25rem" }}>
                Skip the Queue.{" "}
                <span style={{ background: "linear-gradient(135deg, #22d3ee, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Save Your Time.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp}
                style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: "2rem", maxWidth: "480px" }}>
                Get your virtual token, track live waiting times, and arrive at government offices only when your turn is near. No more waiting rooms.
              </motion.p>

              <motion.div variants={fadeUp} style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
                <Link to="/book-token" className="btn btn-teal btn-lg">
                  Get Virtual Token <FiArrowRight size={18} />
                </Link>
                <Link to="/offices" className="btn btn-lg"
                  style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1.5px solid rgba(255,255,255,0.2)", backdropFilter: "blur(10px)" }}>
                  Explore Offices
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} style={{ display: "flex", gap: "2rem", marginTop: "2.5rem" }}>
                {[["10K+", "Tokens Issued"], ["3", "Offices Supported"], ["< 2 min", "Avg Booking Time"]].map(([val, label]) => (
                  <div key={label}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem", color: "white" }}>{val}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>{label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: Queue preview card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              whileHover={{ y: -4 }}>
              <div style={{
                background: "rgba(255,255,255,0.05)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1.25rem",
                padding: "1.5rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "white", fontSize: "0.9rem" }}>Mumbai RTO — Andheri</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>Driving License Service</div>
                  </div>
                  <span style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    fontSize: "0.75rem", color: "#4ade80", fontWeight: 600,
                    background: "rgba(74,222,128,0.1)", padding: "3px 10px", borderRadius: "999px",
                  }}>
                    <span className="status-dot" style={{ background: "#4ade80", boxShadow: "0 0 6px rgba(74,222,128,0.5)" }} />
                    Live Queue
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {demoQueueData.map((item, i) => (
                    <motion.div key={item.token}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        background: item.isYou ? "rgba(37,99,235,0.2)" : "rgba(255,255,255,0.04)",
                        border: item.isYou ? "1px solid rgba(37,99,235,0.4)" : "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "10px", padding: "0.625rem 0.875rem",
                      }}>
                      <div style={{
                        fontFamily: "var(--font-display)", fontWeight: 700, color: item.isYou ? "#60a5fa" : "rgba(255,255,255,0.7)",
                        fontSize: "0.8rem", minWidth: "90px",
                      }}>{item.token}</div>
                      <div style={{ flex: 1, fontSize: "0.8rem", color: item.isYou ? "white" : "rgba(255,255,255,0.5)" }}>
                        {item.isYou ? "You 👤" : item.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: item.isYou ? "#93c5fd" : "rgba(255,255,255,0.4)" }}>{item.wait}</div>
                      <span className={`badge badge-${item.status === "called" ? "warning" : item.status === "issued" && item.isYou ? "info" : "neutral"}`}
                        style={{ fontSize: "0.65rem" }}>
                        {item.status.replace("_", " ")}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div style={{
                  background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.2)",
                  borderRadius: "10px", padding: "0.75rem",
                  fontSize: "0.8rem", color: "rgba(255,255,255,0.7)",
                }}>
                  <span style={{ color: "#5eead4", fontWeight: 600 }}>⏱ Your token:</span>{" "}
                  Estimated wait <strong style={{ color: "white" }}>18–24 minutes</strong>. We'll notify you when to leave.
                </div>
                <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: "0.75rem" }}>
                  Illustrative demo data — actual queue data is live from database
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Wave transition */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, overflow: "hidden", lineHeight: 0 }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: "100%", height: "60px" }}>
            <path d="M0,60 C480,0 960,60 1440,20 L1440,60 Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 0" }}>
        <div className="page-container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="badge badge-blue" style={{ marginBottom: "0.75rem" }}>How It Works</span>
            <h2 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>From booking to service in 4 simple steps</h2>
            <p style={{ color: "var(--color-text-muted)", maxWidth: "520px", margin: "0 auto" }}>
              No app download. No phone calls. No guesswork. Just scan, book, and arrive when it's your turn.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.step} variants={fadeUp}
                  whileHover={{ y: -6 }} whileTap={{ scale: 0.99 }}
                  className="card landing-icon-card" style={{ padding: "1.75rem", position: "relative" }}>
                  <div style={{
                    position: "absolute", top: "1rem", right: "1rem",
                    fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2.5rem",
                    color: "var(--color-border)", lineHeight: 1,
                  }}>{step.step}</div>
                  <div className="landing-icon-tile landing-icon-tile--blue">
                    <Icon size={22} />
                  </div>
                  <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{step.title}</h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>{step.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── Available Offices ─────────────────────────────────────────────── */}
      <section style={{ padding: "4rem 0", background: "var(--color-surface-2)" }}>
        <div className="page-container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span className="badge badge-teal" style={{ marginBottom: "0.5rem" }}>Available Now</span>
              <h2 style={{ fontSize: "1.75rem" }}>Government Offices on QueueLess</h2>
            </div>
            <Link to="/offices" className="btn btn-secondary btn-sm">View All <FiArrowRight size={14} /></Link>
          </motion.div>

          {offices.length === 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card" style={{ padding: "1.5rem" }}>
                  <div className="skeleton" style={{ height: "20px", marginBottom: "0.75rem" }} />
                  <div className="skeleton" style={{ height: "14px", width: "60%", marginBottom: "0.5rem" }} />
                  <div className="skeleton" style={{ height: "14px", width: "80%" }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
              {offices.map((office, i) => (
                <motion.div key={office._id}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="card card-interactive" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                    <span className={`badge ${office.status === "active" ? "badge-success" : "badge-warning"}`}>
                      {office.status === "active" ? "● Open" : "Closed"}
                    </span>
                    <span className="badge badge-neutral">{office.department?.split(" ").slice(0, 2).join(" ")}</span>
                  </div>
                  <h3 style={{ fontSize: "1rem", marginBottom: "0.375rem" }}>{office.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                    <LocationIcon size={12} style={{ display: "inline", marginRight: "4px" }} />
                    {office.address?.area}, {office.address?.city}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                    <div style={{ color: "var(--color-text-muted)" }}>
                      <strong style={{ color: "var(--color-navy)" }}>{office.liveStats?.waitingCount ?? "—"}</strong> waiting
                    </div>
                    <Link to={`/offices/${office._id}`} className="btn btn-secondary btn-sm">
                      Details <FiArrowRight size={12} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Features Grid ─────────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 0" }}>
        <div className="page-container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="badge badge-blue" style={{ marginBottom: "0.75rem" }}>Platform Features</span>
            <h2 style={{ fontSize: "1.75rem" }}>Everything citizens and officers need</h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} variants={fadeUp}
                  whileHover={{ y: -5 }} whileTap={{ scale: 0.99 }}
                  className="card landing-icon-card" style={{ padding: "1.5rem" }}>
                  <div className="landing-icon-tile landing-icon-tile--teal">
                    <Icon size={20} />
                  </div>
                  <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>{f.title}</h3>
                  <p style={{ fontSize: "0.83rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "4rem 0", background: "var(--color-surface-2)" }}>
        <div className="page-container" style={{ maxWidth: "720px" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.75rem" }}>Frequently Asked Questions</h2>
          </motion.div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {faqs.map((faq, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="card" style={{ padding: "1.25rem 1.5rem" }}>
                <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", color: "var(--color-navy)" }}>{faq.q}</h4>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: 0 }}>{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ───────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(135deg, var(--color-blue) 0%, var(--color-teal-dark) 100%)",
        padding: "4rem 0", textAlign: "center",
      }}>
        <div className="page-container">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <h2 style={{ fontSize: "2rem", color: "white", marginBottom: "0.75rem" }}>Ready to skip the queue?</h2>
            <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "2rem", fontSize: "1rem" }}>
              Book your virtual token now and arrive only when your turn is near.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/register" className="btn btn-lg"
                style={{ background: "white", color: "var(--color-blue)", fontWeight: 700 }}>
                Create Free Account <FiArrowRight size={18} />
              </Link>
              <Link to="/offices" className="btn btn-lg"
                style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1.5px solid rgba(255,255,255,0.3)" }}>
                Browse Offices
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mobile responsiveness */}
      <style>{`
        @media (max-width: 768px) {
          section > div > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
    </MotionConfig>
  );
}
