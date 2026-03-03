/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1677ff',
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // 禁用 tailwind 的预检样式，避免与 antd 冲突
  },
}
