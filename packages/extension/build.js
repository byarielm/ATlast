import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const watch = process.argv.includes('--watch');

// Clean dist directory
const distDir = path.join(__dirname, 'dist', 'chrome');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Build configuration base
const buildConfigBase = {
  bundle: true,
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  target: 'es2020',
  format: 'esm',
};

// Build scripts
const scripts = [
  {
    ...buildConfigBase,
    entryPoints: ['src/content/index.ts'],
    outfile: path.join(distDir, 'content', 'index.js'),
  },
  {
    ...buildConfigBase,
    entryPoints: ['src/background/service-worker.ts'],
    outfile: path.join(distDir, 'background', 'service-worker.js'),
  },
  {
    ...buildConfigBase,
    entryPoints: ['src/popup/popup.ts'],
    outfile: path.join(distDir, 'popup', 'popup.js'),
  },
];

// Build function
async function build() {
  try {
    console.log('🔨 Building extension...');

    // Build all scripts
    for (const config of scripts) {
      if (watch) {
        const ctx = await esbuild.context(config);
        await ctx.watch();
        console.log(`👀 Watching ${path.basename(config.entryPoints[0])}...`);
      } else {
        await esbuild.build(config);
        console.log(`✅ Built ${path.basename(config.entryPoints[0])}`);
      }
    }

    // Copy static files
    copyStaticFiles();

    if (!watch) {
      console.log('✨ Build complete!');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Copy static files
function copyStaticFiles() {
  const filesToCopy = [
    { from: 'manifest.json', to: 'manifest.json' },
    { from: 'src/popup/popup.html', to: 'popup/popup.html' },
    { from: 'src/popup/popup.css', to: 'popup/popup.css' },
  ];

  for (const file of filesToCopy) {
    const srcPath = path.join(__dirname, file.from);
    const destPath = path.join(distDir, file.to);

    // Create directory if it doesn't exist
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(srcPath, destPath);
  }

  // Create placeholder icons (TODO: replace with actual icons)
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Create simple text files as placeholder icons
  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const iconPath = path.join(assetsDir, `icon-${size}.png`);
    if (!fs.existsSync(iconPath)) {
      // TODO: Generate actual PNG icons
      fs.writeFileSync(iconPath, `Placeholder ${size}x${size} icon`);
    }
  }

  console.log('📋 Copied static files');
}

// Run build
build();
