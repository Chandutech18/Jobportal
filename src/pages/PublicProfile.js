import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ThemeSwitcher from "../context/ThemeSwitcher";
import { API } from "../config";
const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#d4af37",
];

function withProtocol(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!username) {
      setError("Profile not found.");
      setLoading(false);
      return;
    }

    fetch(`${API}/api/auth/profile/${username}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          return;
        }
        setError(data.error || "Profile not found.");
      })
      .catch(() => setError("Could not load profile."))
      .finally(() => setLoading(false));
  }, [username]);

  const uname = profile?.username || username || "profile";
  const themeColor = useMemo(
    () => COLORS[(uname || "u").charCodeAt(0) % COLORS.length],
    [uname]
  );

  const details = [
    profile?.education && { label: "Education", value: profile.education, icon: "🎓" },
    profile?.experience && { label: "Experience", value: profile.experience, icon: "⏱" },
    profile?.industry && { label: "Industry", value: profile.industry, icon: "💼" },
    profile?.phone && { label: "Phone", value: profile.phone, icon: "📞" },
  ].filter(Boolean);

  const links = [
    profile?.linkedin && { label: "LinkedIn", value: profile.linkedin, href: withProtocol(profile.linkedin) },
    profile?.github && { label: "GitHub", value: profile.github, href: withProtocol(profile.github) },
    profile?.website && { label: "Website", value: profile.website, href: withProtocol(profile.website) },
  ].filter(Boolean);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(`https://careerbharat.in/profile/${uname}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  if (loading) {
    return (
      <div style={s.root}>
        <div style={s.overlayGrid} />
        <div style={s.centerCard}>
          <div style={s.loaderOrb}>⏳</div>
          <div style={s.centerTitle}>Loading profile</div>
          <div style={s.centerText}>Fetching public details for @{username}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.root}>
        <div style={s.overlayGrid} />
        <div style={s.pageShell}>
          <div style={s.topActions}>
            <button onClick={() => navigate("/")} style={s.backBtn}>
              ← Back to Home
            </button>
            <ThemeSwitcher />
          </div>
          <div style={s.centerCard}>
            <div style={s.loaderOrb}>😕</div>
            <div style={s.centerTitle}>Profile unavailable</div>
            <div style={s.centerText}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <div style={s.overlayGrid} />
      <div style={s.pageShell}>
        <div style={s.topActions}>
          <button onClick={() => navigate(-1)} style={s.backBtn}>
            ← Back
          </button>
          <ThemeSwitcher />
        </div>

        <div style={s.brandRow}>
          <div style={s.brandMark}>⚡</div>
          <div>
            <div style={s.brandName}>CareerBharat</div>
            <div style={s.brandSub}>Public profile</div>
          </div>
        </div>

        <div style={s.profileCard}>
          <div
            style={{
              ...s.hero,
              background: `radial-gradient(circle at top right, ${themeColor}44, transparent 34%), linear-gradient(135deg, rgba(var(--accent-rgb), 0.16), rgba(15, 23, 42, 0.15))`,
            }}
          >
            <div style={s.heroLeft}>
              <div
                style={{
                  ...s.avatar,
                  background: `linear-gradient(135deg, ${themeColor}, var(--accent))`,
                }}
              >
                {(profile?.name || "U")[0].toUpperCase()}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={s.roleBadge}>
                  {profile?.role === "recruiter" ? "Recruiter" : "Job Seeker"}
                  {profile?.designation ? ` · ${profile.designation}` : ""}
                </div>
                <h1 style={s.name}>{profile?.name}</h1>
                <div style={s.username}>@{uname}</div>
                <div style={s.metaLine}>
                  {profile?.location ? `📍 ${profile.location}` : "Available across India"}
                </div>
                {(profile?.organisation || profile?.org) && (
                  <div style={s.metaLine}>🏢 {profile?.organisation || profile?.org}</div>
                )}
              </div>
            </div>

            <div style={s.heroStats}>
              {[
                { label: "Connections", value: profile?.connections?.length || 0 },
                { label: "Skills", value: (profile?.skills || []).length },
              ].map((stat) => (
                <div key={stat.label} style={s.statTile}>
                  <div style={s.statValue}>{stat.value}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={s.contentGrid}>
            <div style={s.primaryColumn}>
              {profile?.bio && (
                <section style={s.panel}>
                  <div style={s.sectionLabel}>About</div>
                  <p style={s.bio}>{profile.bio}</p>
                </section>
              )}

              {(profile?.skills || []).length > 0 && (
                <section style={s.panel}>
                  <div style={s.sectionLabel}>Skills</div>
                  <div style={s.skillWrap}>
                    {(profile.skills || []).map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        style={{
                          ...s.skillPill,
                          color: COLORS[index % COLORS.length],
                          borderColor: `${COLORS[index % COLORS.length]}33`,
                          background: `${COLORS[index % COLORS.length]}14`,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {details.length > 0 && (
                <section style={s.panel}>
                  <div style={s.sectionLabel}>Highlights</div>
                  <div style={s.listStack}>
                    {details.map((item) => (
                      <div key={item.label} style={s.infoRow}>
                        <div style={s.infoIcon}>{item.icon}</div>
                        <div>
                          <div style={s.infoLabel}>{item.label}</div>
                          <div style={s.infoValue}>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div style={s.sideColumn}>
              <section style={s.panel}>
                <div style={s.sectionLabel}>Profile link</div>
                <div style={s.linkBox}>
                  <div style={s.publicUrl}>careerbharat.in/profile/{uname}</div>
                  <button onClick={handleCopy} style={s.copyBtn}>
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
              </section>

              {links.length > 0 && (
                <section style={s.panel}>
                  <div style={s.sectionLabel}>Links</div>
                  <div style={s.listStack}>
                    {links.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        style={s.linkRow}
                      >
                        <div>
                          <div style={s.infoLabel}>{item.label}</div>
                          <div style={s.linkValue}>{item.value}</div>
                        </div>
                        <span style={s.linkArrow}>↗</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(var(--accent-rgb), 0.16), transparent 24%), linear-gradient(180deg, var(--dark) 0%, var(--dark2) 100%)",
    color: "var(--text)",
    fontFamily: "var(--font-body)",
    position: "relative",
    overflow: "hidden",
  },
  overlayGrid: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
    backgroundSize: "54px 54px",
  },
  pageShell: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "28px 20px 48px",
  },
  topActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  backBtn: {
    background: "var(--card-bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "12px",
    padding: "11px 16px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    backdropFilter: "blur(14px)",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "22px",
  },
  brandMark: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, var(--blue-light), var(--accent))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 16px 36px rgba(var(--accent-rgb), 0.18)",
  },
  brandName: {
    fontSize: "22px",
    fontWeight: 900,
    fontFamily: "var(--font-display)",
  },
  brandSub: {
    fontSize: "12px",
    color: "var(--text-dim)",
    marginTop: "2px",
  },
  profileCard: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid var(--border)",
    borderRadius: "28px",
    overflow: "hidden",
    boxShadow: "0 32px 80px var(--shadow)",
    backdropFilter: "blur(24px)",
  },
  hero: {
    padding: "30px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    flexWrap: "wrap",
  },
  heroLeft: {
    display: "flex",
    gap: "18px",
    alignItems: "center",
    flex: 1,
    minWidth: "260px",
  },
  avatar: {
    width: "92px",
    height: "92px",
    borderRadius: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "34px",
    fontWeight: 900,
    color: "#fff",
    boxShadow: "0 20px 42px rgba(15, 23, 42, 0.3)",
    flexShrink: 0,
  },
  roleBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "rgba(var(--accent-rgb), 0.12)",
    border: "1px solid var(--border-accent)",
    color: "var(--accent)",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: "12px",
  },
  name: {
    fontSize: "clamp(28px, 4vw, 40px)",
    fontWeight: 900,
    lineHeight: 1.05,
    margin: 0,
    fontFamily: "var(--font-display)",
  },
  username: {
    fontSize: "14px",
    color: "var(--text-dim)",
    fontFamily: "monospace",
    marginTop: "8px",
  },
  metaLine: {
    fontSize: "14px",
    color: "var(--text-dim)",
    marginTop: "8px",
  },
  heroStats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
    gap: "12px",
    minWidth: "260px",
  },
  statTile: {
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid var(--border)",
    borderRadius: "18px",
    padding: "18px",
    textAlign: "center",
  },
  statValue: {
    fontSize: "30px",
    fontWeight: 900,
    color: "var(--text)",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: "11px",
    color: "var(--text-dim)",
    marginTop: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
    padding: "24px",
  },
  primaryColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  sideColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  panel: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    padding: "20px",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--accent)",
    marginBottom: "14px",
  },
  bio: {
    fontSize: "15px",
    lineHeight: 1.8,
    color: "var(--text-dim)",
    margin: 0,
  },
  skillWrap: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  skillPill: {
    fontSize: "13px",
    fontWeight: 700,
    padding: "8px 12px",
    borderRadius: "999px",
    border: "1px solid transparent",
  },
  listStack: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  infoRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    padding: "12px 14px",
    background: "var(--card-bg)",
    borderRadius: "16px",
    border: "1px solid var(--border)",
  },
  infoIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(var(--accent-rgb), 0.1)",
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: "10px",
    color: "var(--text-muted)",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: "4px",
  },
  infoValue: {
    fontSize: "14px",
    color: "var(--text)",
    fontWeight: 600,
  },
  linkBox: {
    background: "var(--card-bg)",
    border: "1px solid var(--border-accent)",
    borderRadius: "18px",
    padding: "16px",
  },
  publicUrl: {
    fontSize: "13px",
    color: "var(--text)",
    fontFamily: "monospace",
    lineHeight: 1.6,
    wordBreak: "break-all",
    marginBottom: "12px",
  },
  copyBtn: {
    width: "100%",
    background: "linear-gradient(135deg, var(--blue), var(--blue-light))",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    padding: "11px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--font-body)",
  },
  linkRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "13px 14px",
    background: "var(--card-bg)",
    borderRadius: "16px",
    border: "1px solid var(--border)",
  },
  linkValue: {
    fontSize: "13px",
    color: "var(--blue-light)",
    wordBreak: "break-word",
  },
  linkArrow: {
    color: "var(--text-dim)",
    fontSize: "16px",
    flexShrink: 0,
  },
  centerCard: {
    minHeight: "60vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 24px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid var(--border)",
    borderRadius: "28px",
    boxShadow: "0 28px 70px var(--shadow)",
    maxWidth: "520px",
    margin: "0 auto",
  },
  loaderOrb: {
    width: "74px",
    height: "74px",
    borderRadius: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, var(--blue-light), var(--accent))",
    fontSize: "30px",
    marginBottom: "18px",
  },
  centerTitle: {
    fontSize: "24px",
    fontWeight: 900,
    fontFamily: "var(--font-display)",
    marginBottom: "8px",
  },
  centerText: {
    fontSize: "14px",
    color: "var(--text-dim)",
    lineHeight: 1.7,
  },
};
