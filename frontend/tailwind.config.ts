import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rr: {
          // Cinematic Rail — Cold slate w/ cyan undertone
          bg: "#07081C",
          surface: "#0E1030",
          card: "#14163C",
          border: "#2A2D5A",
          cyan: "#22D3EE", indigo: "#E879F9",
          text: "#E2E8F0", muted: "#64748B",
          amber: "#F59E0B", green: "#34D399", red: "#F87171",
        },
      },
    },
  },
  plugins: [],
};
export default config;
