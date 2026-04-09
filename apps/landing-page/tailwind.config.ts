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
        marca: {
          gold: "#D4AF37",
          goldLight: "#F3E5AB",
          dark: "#1E293B",
          darker: "#0F172A"
        },
        admin: {
          dark: "#0F172A",
          card: "#1E293B",
          border: "#334155",
          gold: "#D4AF37",
          green: "#10B981",
          blue: "#3B82F6"
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
