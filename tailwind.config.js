/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        kesari: {
          primary: "#FF9933",
          secondary: "#FFC107",
          background: "#F9FAFB",
          surface: "#FFFFFF",
          text: "#1F2937",
          muted: "#6B7280",
          success: "#10B981",
        },
      },
    },
  },
  plugins: [],
};
