import { defineConfig } from 'vite'

export default defineConfig({
  base: '/PepperGhostEffect/',
  server: {
    host: true,
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})