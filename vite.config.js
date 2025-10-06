import { defineConfig } from 'vite'

export default defineConfig({
  base: '/PepperGhostEffect/',
  server: {
    host: true,
    port: 3000,
    // Allow all hosts (including ngrok tunnels)
    allowedHosts: [
      '.ngrok-free.app',  // Allow all ngrok domains
      '.ngrok.io',        // Legacy ngrok domains
      'localhost'         // Local development
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})