import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#1a2035", deep: "#0f1628", surface: "#222b45" },
        gold: { DEFAULT: "#C9A84C", light: "#E8C870", tint: "#FAF6EA" },
        ink: "#1e2536",
        muted: "#7d869e",
        line: "#e2e6ee",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
