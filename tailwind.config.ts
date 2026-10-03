import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          950: "#05070a",
          900: "#080c14",
          850: "#0d131f",
          800: "#131b2b",
          750: "#182337",
          700: "#1f2d45",
          600: "#2d3e5c",
        },
        brand: {
          blue: "#3b82f6",
          cyan: "#06b6d4",
          purple: "#8b5cf6",
          violet: "#6366f1",
          gold: "#f59e0b",
          emerald: "#10b981",
          rose: "#f43f5e"
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "luxury-gradient": "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)",
        "cyber-glow": "radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.25) 0%, transparent 70%)",
        "card-glass": "linear-gradient(180deg, rgba(19, 27, 43, 0.7) 0%, rgba(13, 19, 31, 0.7) 100%)"
      },
      boxShadow: {
        "glow-sm": "0 0 15px -3px rgba(59, 130, 246, 0.3)",
        "glow-md": "0 0 25px -5px rgba(59, 130, 246, 0.4)",
        "glow-purple": "0 0 25px -5px rgba(139, 92, 246, 0.4)",
        "glow-cyan": "0 0 25px -5px rgba(6, 182, 212, 0.4)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2.5s infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" }
        }
      }
    },
  },
  plugins: [],
};

export default config;
