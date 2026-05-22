import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        shell: "#fff8fb",
        blush: "#ffe4ef",
        rose: "#f75f98",
        "rose-dark": "#d6447c",
        lavender: "#efe2ff",
        peach: "#fff3eb",
        mint: "#edfbf0",
        ink: "#3b2d3b",
        line: "#f3c7d8"
      },
      boxShadow: {
        card: "0 20px 60px rgba(247, 95, 152, 0.12)"
      },
      borderRadius: {
        shell: "30px"
      }
    }
  },
  plugins: []
};

export default config;
