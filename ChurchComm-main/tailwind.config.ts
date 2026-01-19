
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#0F172A", // Deep space blue
        foreground: "#E2E8F0", // Soft light gray
        primary: {
          DEFAULT: "#38BDF8", // Vibrant sky blue
          foreground: "#0F172A",
        },
        secondary: {
          DEFAULT: "#334155", // Muted slate
          foreground: "#E2E8F0",
        },
        destructive: {
          DEFAULT: "#F43F5E", // Alert rose
          foreground: "#FECDD3",
        },
        muted: {
          DEFAULT: "#475569", // Subtle gray
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#A78BFA", // Cool violet
          foreground: "#1E1B4B",
        },
        popover: {
          DEFAULT: "#1E293B",
          foreground: "#E2E8F0",
        },
        card: {
          DEFAULT: "#1E293B", // Elevated dark surface
          foreground: "#E2E8F0",
        },
        success: "#10B981", // Emerald green
        warning: "#F59E0B", // Amber
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
