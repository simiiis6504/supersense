/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tremor: {
          brand: {
            faint: "#eff6ff",
            muted: "#bfdbfe",
            subtle: "#60a5fa",
            DEFAULT: "#a855f7", // Purple-500
            emphasis: "#9333ea", // Purple-600
            inverted: "#ffffff",
          },
          background: {
            muted: "#1e293b", // Slate-800
            subtle: "#0f172a", // Slate-900
            DEFAULT: "#020617", // Slate-950 (Main bg)
            emphasis: "#cbd5e1",
          },
          border: {
            DEFAULT: "#1e293b",
          },
          ring: {
            DEFAULT: "#334155",
          },
          content: {
            subtle: "#475569",
            DEFAULT: "#94a3b8",
            emphasis: "#f8fafc",
            strong: "#ffffff",
            inverted: "#000000",
          },
        },
      },
      boxShadow: {
        "tremor-card": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "tremor-dropdown": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      },
      borderRadius: {
        "tremor-default": "0.5rem",
        "tremor-full": "9999px",
      },
    },
  },
  plugins: [],
};