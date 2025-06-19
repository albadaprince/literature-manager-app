import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This ensures a modern JavaScript target environment that supports
    // the 'import.meta.env' syntax for securely loading your keys.
    target: 'esnext'
  }
})
