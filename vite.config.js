import { defineConfig } from 'vite'
import { resolve } from 'path'

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
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cake: resolve(__dirname, 'cake.html'),
        fu: resolve(__dirname, 'fu.html')
      }
    }
  }
})