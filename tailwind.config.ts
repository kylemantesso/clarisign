import type { Config } from "tailwindcss";

const { fontFamily } = require('tailwindcss/defaultTheme');

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [...fontFamily.sans],
        dyslexic: ['"OpenDyslexic"', ...fontFamily.sans], // Add your font here
      },
      fontSize: {
        sm: "1rem", // Default: 0.875rem -> 20% larger
        base: "1.2rem", // Default: 1rem -> 20% larger
        lg: "1.44rem", // Default: 1.125rem -> 20% larger
        xl: "1.728rem", // Default: 1.25rem -> 20% larger
        "2xl": "2.0736rem", // Default: 1.5rem -> 20% larger
        "3xl": "2.48832rem", // Default: 1.875rem -> 20% larger
        "4xl": "2.9856rem", // Default: 2.25rem -> 20% larger
        "5xl": "3.58272rem", // Default: 3rem -> 20% larger
        "6xl": "4.29926rem", // Default: 3.75rem -> 20% larger
      },
      colors: {
        gray: {
          DEFAULT: '#333333', // Set your dark grey color
        },
      },
      textColor: {
        DEFAULT: '#333333', // Set your dark grey color for text
      },
    },
  },
  plugins: [],
} satisfies Config;
