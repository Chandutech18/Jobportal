import React, { useState } from "react";
import { useTheme } from "./ThemeContext";

export default function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);

  const current = themes.find((t) => t.id === theme) || themes[0];

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Change theme"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          background: "var(--card-bg)",
          border: "1px solid var(--border-accent)",
          borderRadius: "10px",
          padding: "7px 12px",
          cursor: "pointer",
          color: "var(--text)",
          fontSize: "13px",
          fontWeight: 600,
          transition: "all 0.2s",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Color dot */}
        <span
          style={{
            width: 13,
            height: 13,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${current.preview[1]}, ${current.preview[2]})`,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span>{current.emoji} {current.label}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        >
          <path d="M1 3l4 4 4-4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setOpen(false)}
          />

          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 1000,
              background: "var(--dark2)",
              border: "1px solid var(--border-accent)",
              borderRadius: "14px",
              padding: "10px",
              minWidth: "190px",
              boxShadow: "0 16px 48px var(--shadow)",
              backdropFilter: "blur(16px)",
              animation: "fadeUp 0.15s ease",
            }}
          >
            <p style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              padding: "2px 6px 8px",
            }}>
              Choose Theme
            </p>

            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: "9px",
                  border: "none",
                  cursor: "pointer",
                  background: theme === t.id ? "rgba(var(--accent-rgb),0.12)" : "transparent",
                  color: theme === t.id ? "var(--accent)" : "var(--text)",
                  fontSize: "13px",
                  fontWeight: theme === t.id ? 700 : 500,
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (theme !== t.id) e.currentTarget.style.background = "rgba(var(--accent-rgb),0.06)";
                }}
                onMouseLeave={(e) => {
                  if (theme !== t.id) e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Color swatches */}
                <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                  {t.preview.map((c, i) => (
                    <span key={i} style={{
                      width: i === 0 ? 16 : 10,
                      height: 16,
                      borderRadius: "4px",
                      background: c,
                      border: "1px solid rgba(255,255,255,0.1)",
                      flexShrink: 0,
                    }} />
                  ))}
                </div>
                <span>{t.emoji} {t.label}</span>
                {theme === t.id && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: "auto" }}>
                    <path d="M2 6l3 3 5-5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}