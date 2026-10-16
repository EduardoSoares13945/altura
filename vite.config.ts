import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules/zod/')) return
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/zod/')) return 'vendor-zod'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'vendor-react'
        },
      },
    },
  },
})
