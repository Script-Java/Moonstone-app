/** @type {import('tailwindcss').Config} */
module.exports = {


  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#120b18",
        bg2: "#191022",
        surface: "rgba(255,255,255,0.06)",
        surface2: "rgba(255,255,255,0.08)",
        border: "rgba(255,255,255,0.10)",
        muted: "rgba(255,255,255,0.60)",
        faint: "rgba(255,255,255,0.35)",
        primary: "#7311d4",
        primary2: "#8e2de2",
        good: "#34d399",
        danger: "#fb7185",
      },
    },
  },
  plugins: [],
}