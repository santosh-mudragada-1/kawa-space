import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: { compress: { passes: 2 }, format: { comments: false } },
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
    cssCodeSplit: mode !== 'single',
    reportCompressedSize: false,
  },
}))
