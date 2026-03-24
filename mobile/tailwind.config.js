/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#e0f2fe',
        card: '#ffffff',
        text: '#0f172a',
        primary: '#3b82f6',
      },
    },
  },
  plugins: [],
}
