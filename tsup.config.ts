import path from "path";
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [path.resolve(__dirname, "src", "index.ts")],
  dts: true,
  tsconfig: './tsconfig.json',
  splitting: false,
  minify: false,
  format: ['esm'],
  bundle: false,
  platform: 'node',
})