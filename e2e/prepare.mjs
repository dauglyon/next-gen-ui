import { cpSync, mkdirSync, rmSync } from 'node:fs';

// Copy the built example remote into the host build, under the same-origin path
// the app fetches plugin assets from (/plugin-registry/assets/{id}). This lets
// the browser test load a real remote through the real host loader without a
// second server or CORS. Run after `vite build` and `build:example-plugin`.
const src = 'examples/example-plugin/dist';
const dest = 'dist/plugin-registry/assets/example';
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`copied ${src} -> ${dest}`);
