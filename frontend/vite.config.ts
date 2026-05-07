import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("echarts")) {
            return "charts-vendor";
          }
          if (id.includes("@ant-design/icons")) {
            return "ant-icons-vendor";
          }
          if (
            id.includes("rc-table") ||
            id.includes("rc-pagination") ||
            id.includes("rc-picker") ||
            id.includes("rc-select") ||
            id.includes("rc-tree") ||
            id.includes("rc-tree-select") ||
            id.includes("rc-virtual-list") ||
            id.includes("rc-tabs")
          ) {
            return "antd-heavy-vendor";
          }
          if (
            id.includes("rc-field-form") ||
            id.includes("rc-input") ||
            id.includes("rc-textarea") ||
            id.includes("rc-checkbox") ||
            id.includes("rc-upload") ||
            id.includes("rc-switch") ||
            id.includes("rc-segmented")
          ) {
            return "antd-form-vendor";
          }
          if (
            id.includes("@ant-design/cssinjs") ||
            id.includes("@ant-design/colors") ||
            id.includes("@ant-design/fast-color") ||
            id.includes("rc-motion") ||
            id.includes("rc-menu") ||
            id.includes("rc-dropdown") ||
            id.includes("rc-dialog") ||
            id.includes("rc-notification") ||
            id.includes("rc-tooltip") ||
            id.includes("rc-overflow") ||
            id.includes("rc-util") ||
            id.includes("@rc-component")
          ) {
            return "antd-runtime-vendor";
          }
          if (id.includes("antd") || id.includes("@ant-design") || id.includes("rc-")) {
            return "antd-vendor";
          }
          if (id.includes("react-router")) {
            return "router-vendor";
          }
          if (id.includes("react-dom") || id.includes("react")) {
            return "react-vendor";
          }
          if (id.includes("axios")) {
            return "network-vendor";
          }
          if (id.includes("dayjs")) {
            return "utility-vendor";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
