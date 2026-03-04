import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f3f7fb",
          100: "#e5ecf5",
          200: "#c4d2e5",
          300: "#9eb4cf",
          400: "#6f88ad",
          500: "#4f6a8f",
          600: "#3c5372",
          700: "#2f425a",
          800: "#273548",
          900: "#1a2432"
        },
        coral: {
          500: "#ef6f4f",
          600: "#da5f41",
          700: "#ba4d33"
        },
        mint: {
          500: "#36b391",
          600: "#2a9779"
        }
      },
      boxShadow: {
        panel: "0 18px 50px rgba(17, 31, 51, 0.16)",
        focus: "0 0 0 3px rgba(239, 111, 79, 0.28)"
      },
      borderRadius: {
        panel: "1.25rem"
      },
      fontFamily: {
        display: ['"Space Grotesk"', "Segoe UI", "sans-serif"],
        body: ['"IBM Plex Sans"', "Trebuchet MS", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
