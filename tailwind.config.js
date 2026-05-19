/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Neo-Brutalism brand colors (Toned down)
        "primary":                    "#FF8E8B", // Pastel Salmon Pink
        "on-primary":                 "#000000",
        "primary-container":          "#FFB2B0",
        "on-primary-container":       "#000000",
        
        // Secondary
        "secondary":                  "#F4D06F", // Pastel Mustard Yellow
        "on-secondary":               "#000000",
        "secondary-container":        "#F9E3A3",
        "on-secondary-container":     "#000000",
        
        // Tertiary
        "tertiary":                   "#B5D99C", // Pastel Sage Green
        "on-tertiary":                "#000000",
        "tertiary-container":         "#CBE6B8",
        "on-tertiary-container":      "#000000",
        
        // Surface & Backgrounds
        "surface":                    "#FFFFFF",
        "surface-dim":                "#F0F0F0",
        "surface-bright":             "#FFFFFF",
        "surface-variant":            "#EAEAEA",
        "surface-container-lowest":   "#FFFFFF",
        "surface-container-low":      "#FAFAFA",
        "surface-container":          "#F4F4F4",
        "surface-container-high":     "#EFEFEF",
        "surface-container-highest":  "#E6E6E6",
        "inverse-surface":            "#000000",
        "inverse-on-surface":         "#FFFFFF",
        
        // On-Surface
        "on-surface":                 "#000000",
        "on-surface-variant":         "#333333",
        "on-background":              "#000000",
        
        // Background
        "background":                 "#F4F4F0", // Off-white/cream paper
        
        // Outline
        "outline":                    "#000000",
        "outline-variant":            "#222222",
        
        // Error
        "error":                      "#EF476F", // Muted Red
        "on-error":                   "#FFFFFF",
        "error-container":            "#F586A1",
        "on-error-container":         "#000000",
      },
      borderRadius: {
        DEFAULT: "0px", // Brutalism avoids rounded corners by default, but we'll leave basic tokens
        sm:      "0px",
        lg:      "4px",
        xl:      "8px",
        "2xl":   "12px",
        full:    "9999px",
      },
      fontFamily: {
        headline: ["Lexend", "sans-serif"],
        body:     ["Public Sans", "sans-serif"],
        label:    ["Lexend", "sans-serif"],
      },
      animation: {
        "spin-slow":    "spin 3s linear infinite",
        "spin-reverse": "spin 2s linear infinite reverse",
        "pulse-soft":   "pulse 2s ease-in-out infinite",
      },
      boxShadow: {
        "panel":  "4px 4px 0px 0px rgba(0,0,0,1)",
        "button": "2px 2px 0px 0px rgba(0,0,0,1)",
        "brutal": "6px 6px 0px 0px rgba(0,0,0,1)",
        "brutal-sm": "3px 3px 0px 0px rgba(0,0,0,1)",
      },
    },
  },
  plugins: [],
}
