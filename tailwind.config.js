/** @type {import('tailwindcss').Config} */
module.exports = {


  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    fontFamily: {
      sans: ["Inter_400Regular"],
      serif: ["Inter_400Regular"],
    },
    extend: {
      fontFamily: {
        // Map specific weights to loaded font families
        regular: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
      },
      fontWeight: {
        // Ensure weight classes map to actual loaded fonts
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      letterSpacing: {
        tighter: '-0.3px',
        tight: '-0.2px',
        normal: '0px',
        wide: '0.1px',
        wider: '0.2px',
      },
      colors: {
        white: "#F9FAFB",
        bg: "#000000",  // Obsidian background
        bg2: "#0a0a0a",  // Obsidian background2
        surface: "rgba(255,255,255,0.04)",  // Obsidian surface
        surface2: "rgba(255,255,255,0.06)",  // Obsidian surface2
        border: "rgba(255,255,255,0.08)",  // Obsidian border
        muted: "rgba(255,255,255,0.70)",  // Obsidian textMuted
        faint: "rgba(255,255,255,0.45)",  // Obsidian textFaint
        primary: "#FDFBD4",  // Obsidian primary (cream)
        "on-primary": "#000000",  // Obsidian onPrimary (black)
        primary2: "#e5e5e5",  // Obsidian primary2
        good: "#10b981",  // Obsidian good
        danger: "#ef4444",  // Obsidian danger
      },
    },
  },
  plugins: [],
}