import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/ATlast/',  // replace with actual repo name
  plugins: [react()],
})