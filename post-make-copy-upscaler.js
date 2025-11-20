// post-make-copy-upscaler.js
// Copies upscaler-bin to all output resources folders after Electron Forge make

const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

const src = path.resolve(__dirname, 'upscaler-bin');
const outDir = path.resolve(__dirname, 'out');

if (!fs.existsSync(src)) {
  console.error('upscaler-bin folder not found!');
  process.exit(1);
}

// Find all resources folders in out/*/resources
const outFolders = fs.readdirSync(outDir).filter(f => fs.lstatSync(path.join(outDir, f)).isDirectory());
let copied = false;
outFolders.forEach(folder => {
  const resourcesPath = path.join(outDir, folder, 'resources', 'upscaler-bin');
  copyRecursiveSync(src, resourcesPath);
  console.log('Copied upscaler-bin to', resourcesPath);
  copied = true;
});
if (!copied) {
  console.warn('No output folders found in out/. Did you run npm run make?');
}