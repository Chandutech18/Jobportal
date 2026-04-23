import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const THEMES = [
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🌙",
    preview: ["#060e1f", "#d4af37", "#3b82f6"],
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    preview: ["#030f12", "#22d3ee", "#14b8a6"],
  },
  {
    id: "forest",
    label: "Forest",
    emoji: "🌿",
    preview: ["#030a03", "#84cc16", "#16a34a"],
  },
  {
    id: "rose",
    label: "Rose",
    emoji: "🌸",
    preview: ["#0f0208", "#f472b6", "#ec4899"],
  },
  {
    id: "slate",
    label: "Light",
    emoji: "☀️",
    preview: ["#f8fafc", "#6366f1", "#3b82f6"],
  },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("cb_theme") || "midnight"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cb_theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}