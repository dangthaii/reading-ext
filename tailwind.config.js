/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: [
    "./popup.tsx",
    "./content.tsx",
    "./sidepanel.tsx",
    "./contents/**/*.tsx",
    "./components/**/*.tsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Lora", "serif"],
        serif: ["Lora", "serif"]
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out"
      },
      keyframes: {
        fadeIn: {
          from: {
            opacity: "0",
            transform: "translate(-50%, -100%) translateY(10px)"
          },
          to: {
            opacity: "1",
            transform: "translate(-50%, -100%) translateY(0)"
          }
        }
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
}
