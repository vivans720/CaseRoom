/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // Extra-small: phones with narrow screens (320px - 360px)
        xs: "360px",
      },
      maxHeight: {
        "42": "10.5rem",
      },
    },
  },
  plugins: [],
}
