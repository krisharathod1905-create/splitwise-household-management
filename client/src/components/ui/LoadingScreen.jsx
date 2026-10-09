export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--color-bg)",
    }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{
          width: "52px", height: "52px",
          background: "linear-gradient(135deg, var(--color-blue), var(--color-teal))",
          borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 800, fontSize: "24px",
          fontFamily: "var(--font-display)",
          animation: "float 2s ease-in-out infinite",
        }}>Q</div>
      </div>
      <div style={{
        width: "40px", height: "40px", borderRadius: "50%",
        border: "3px solid var(--color-border)",
        borderTopColor: "var(--color-blue)",
        animation: "spin-slow 0.8s linear infinite",
        marginBottom: "1rem",
      }} />
      <p style={{
        fontFamily: "var(--font-display)", fontWeight: 500,
        color: "var(--color-text-muted)", fontSize: "0.9rem",
      }}>{message}</p>
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
    </div>
  );
}
