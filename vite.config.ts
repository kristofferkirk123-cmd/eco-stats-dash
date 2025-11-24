import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { spawn, ChildProcess } from "child_process";

// Custom plugin to start Express settings server in dev mode
function settingsServerPlugin() {
  let serverProcess: ChildProcess | null = null;

  return {
    name: 'settings-server',
    configureServer() {
      // Start the Express server when Vite dev server starts
      console.log('🚀 Starting settings server...');
      serverProcess = spawn('node', ['server.js'], {
        stdio: 'inherit',
        shell: true
      });

      serverProcess.on('error', (err) => {
        console.error('❌ Settings server error:', err);
      });
    },
    closeBundle() {
      // Kill the Express server when Vite stops
      if (serverProcess) {
        console.log('🛑 Stopping settings server...');
        serverProcess.kill();
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "development" && settingsServerPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
