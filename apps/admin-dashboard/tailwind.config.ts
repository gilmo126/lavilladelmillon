import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          dark: "#0F172A",     // Slate 900
          card: "#1E293B",     // Slate 800
          border: "#334155",   // Slate 700
          gold: "#D4AF37",
          green: "#10B981",    // Success
          blue: "#3B82F6"      // Info
        }
      }
    },
  },
  plugins: [],
};
export default config;
