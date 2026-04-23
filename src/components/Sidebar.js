import React from "react";
import { useNavigate } from "react-router-dom";
import ThemeSwitcher from "../context/ThemeSwitcher";

const SEEKER_NAV = [
  { icon: "🏠", label: "Dashboard", key: "dashboard" },
  { icon: "💼", label: "Browse Jobs", key: "jobs" },
  { icon: "📄", label: "Resume Analyzer", key: "resume" },
  { icon: "🤖", label: "AI Chatbot", key: "chatbot" },
  { icon: "📚", label: "Exam Resources", key: "exams" },
  { icon: "👥", label: "Top Profiles", key: "profiles" },
  { icon: "💬", label: "Messages", key: "messages" },
  { icon: "⭐", label: "Saved Jobs", key: "saved" },
  { icon: "📊", label: "Applications", key: "applications" },
  { icon: "👤", label: "My Profile", key: "profile" },
];

const RECRUITER_NAV = [
  { icon: "🏠", label: "Dashboard", key: "dashboard" },
  { icon: "📋", label: "Post a Job", key: "post" },
  { icon: "👥", label: "Candidates", key: "profiles" },
  { icon: "📁", label: "My Listings", key: "listings" },
  { icon: "💬", label: "Messages", key: "messages" },
  { icon: "📊", label: "Analytics", key: "analytics" },
  { icon: "🤖", label: "AI Shortlist", key: "chatbot" },
  { icon: "👤", label: "My Profile", key: "profile" },
];

export default function Sidebar({
  active,
  onNavigate,
  collapsed,
  onToggle,
  recruiterMode,
  mobile = false,
  mobileOpen = false,
  onClose,
}) {
  const navigate = useNavigate();
  const items = recruiterMode ? RECRUITER_NAV : SEEKER_NAV;
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const compact = collapsed && !mobile;

  const goHome = () => navigate("/");
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleNavigate = (key) => {
    onNavigate(key);
    if (mobile && onClose) onClose();
  };

  const handleHome = () => {
    goHome();
    if (mobile && onClose) onClose();
  };

  const handleLogout = () => {
    logout();
    if (mobile && onClose) onClose();
  };

  return (
    <aside
      style={{
        ...s.root,
        width: mobile ? "280px" : compact ? "78px" : "264px",
        position: mobile ? "fixed" : "sticky",
        transform: mobile ? `translateX(${mobileOpen ? "0" : "-100%"})` : "none",
        zIndex: mobile ? 120 : 20,
        boxShadow: mobile ? "0 24px 60px rgba(0,0,0,0.35)" : s.root.boxShadow,
      }}
    >
      <div style={s.logoRow}>
        <div style={s.mark}>⚡</div>
        {!compact && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.name}>CareerBharat</div>
            <div style={s.sub}>AI PORTAL</div>
          </div>
        )}
        <button onClick={mobile ? onClose : onToggle} style={s.toggle} title="Toggle sidebar">
          {mobile ? "✕" : compact ? "▶" : "◀"}
        </button>
      </div>

      <div style={{ padding: compact ? "10px 10px 6px" : "12px 14px 8px" }}>
        <button
          onClick={handleHome}
          title="Back to Home"
          style={{
            ...s.homeBtn,
            justifyContent: compact ? "center" : "flex-start",
            padding: compact ? "11px" : "11px 14px",
          }}
        >
          <span style={{ fontSize: "16px" }}>🏡</span>
          {!compact && <span>Back to Home</span>}
        </button>
      </div>

      {!compact && (
        <div style={s.userCard} onClick={() => handleNavigate("profile")}>
          <div style={s.avatar}>{(user.name || "U")[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.uName}>{user.name || "User"}</div>
            <div style={s.uRole}>
              {recruiterMode ? "Recruiter Workspace" : "Job Seeker Workspace"}
            </div>
          </div>
          <span style={s.editHint}>✎</span>
        </div>
      )}

      <nav style={s.nav}>
        {!compact && <div style={s.navLabel}>Navigation</div>}
        {items.map((item) => {
          const selected = active === item.key;

          return (
            <button
              key={item.key}
              title={compact ? item.label : ""}
              onClick={() => handleNavigate(item.key)}
              style={{
                ...s.btn,
                ...(selected ? s.btnOn : {}),
                justifyContent: compact ? "center" : "flex-start",
              }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {!compact && <span style={s.navText}>{item.label}</span>}
              {!compact && selected && <span style={s.dot} />}
            </button>
          );
        })}
      </nav>

      <div style={s.bottom}>
        {!compact && (
          <div style={s.themeWrap}>
            <ThemeSwitcher />
          </div>
        )}

        {!compact && (
          <div style={s.aiBox}>
            <span style={{ fontSize: "16px" }}>🤖</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.aiTitle}>Groq AI Active</div>
              <div style={s.aiSub}>LLaMA 3.3 70B · Live assistant</div>
            </div>
            <span style={s.aiStatus} />
          </div>
        )}

        <button
          onClick={handleLogout}
          title={compact ? "Logout" : ""}
          style={{
            ...s.logoutBtn,
            justifyContent: compact ? "center" : "flex-start",
          }}
        >
          <span>🚪</span>
          {!compact && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

const s = {
  root: {
    height: "100vh",
    background:
      "linear-gradient(180deg, var(--sidebar-bg) 0%, rgba(15, 23, 42, 0.95) 100%)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    transition: "width 0.25s ease, transform 0.25s ease",
    flexShrink: 0,
    top: 0,
    left: 0,
    overflow: "hidden",
    boxShadow: "inset -1px 0 0 rgba(var(--accent-rgb), 0.06)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "18px 14px",
    borderBottom: "1px solid var(--border)",
    minHeight: "72px",
  },
  mark: {
    width: "38px",
    height: "38px",
    flexShrink: 0,
    background: "linear-gradient(135deg, var(--blue-light), var(--accent))",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    boxShadow: "0 10px 24px rgba(var(--accent-rgb), 0.22)",
  },
  name: {
    fontSize: "16px",
    fontWeight: 800,
    color: "var(--text)",
    fontFamily: "var(--font-display)",
  },
  sub: {
    fontSize: "9px",
    fontWeight: 800,
    color: "var(--accent)",
    letterSpacing: "2.4px",
    marginTop: "2px",
  },
  toggle: {
    marginLeft: "auto",
    background: "var(--card-bg)",
    border: "1px solid var(--border)",
    color: "var(--text-dim)",
    width: "26px",
    height: "26px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  homeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    width: "100%",
    background: "rgba(var(--accent-rgb), 0.1)",
    border: "1px solid var(--border-accent)",
    borderRadius: "12px",
    color: "var(--accent)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--font-body)",
  },
  userCard: {
    margin: "8px 14px 14px",
    padding: "14px",
    background: "linear-gradient(135deg, var(--card-bg), rgba(var(--accent-rgb), 0.06))",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    cursor: "pointer",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, var(--blue-light), var(--accent))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "15px",
    color: "#fff",
    flexShrink: 0,
  },
  uName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  uRole: {
    fontSize: "11px",
    color: "var(--text-dim)",
    marginTop: "2px",
  },
  editHint: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  nav: {
    flex: 1,
    padding: "8px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  navLabel: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "2px",
    color: "var(--text-muted)",
    padding: "8px 10px 6px",
    textTransform: "uppercase",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 13px",
    borderRadius: "12px",
    background: "transparent",
    border: "1px solid transparent",
    color: "var(--text-dim)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.18s ease",
    width: "100%",
    fontFamily: "var(--font-body)",
  },
  btnOn: {
    background: "rgba(var(--accent-rgb), 0.12)",
    border: "1px solid var(--border-accent)",
    color: "var(--text)",
    boxShadow: "0 8px 24px rgba(var(--accent-rgb), 0.12)",
  },
  navIcon: {
    fontSize: "16px",
    flexShrink: 0,
    width: "20px",
    textAlign: "center",
  },
  navText: {
    flex: 1,
    textAlign: "left",
  },
  dot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "var(--accent)",
    flexShrink: 0,
    boxShadow: "0 0 12px rgba(var(--accent-rgb), 0.6)",
  },
  bottom: {
    padding: "12px 14px 14px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  themeWrap: {
    display: "flex",
    justifyContent: "flex-start",
  },
  aiBox: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    background: "linear-gradient(135deg, rgba(var(--accent-rgb), 0.08), var(--card-bg))",
    border: "1px solid var(--border-accent)",
    borderRadius: "14px",
    padding: "12px",
  },
  aiTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text)",
  },
  aiSub: {
    fontSize: "10px",
    color: "var(--text-dim)",
    marginTop: "2px",
  },
  aiStatus: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    background: "#22c55e",
    flexShrink: 0,
    boxShadow: "0 0 14px rgba(34, 197, 94, 0.45)",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 13px",
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.18)",
    borderRadius: "12px",
    color: "#fda4af",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    fontFamily: "var(--font-body)",
  },
};
