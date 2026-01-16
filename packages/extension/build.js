import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const watch = process.argv.includes('--watch');

// Determine build mode: mock, dev, or prod
let mode = 'dev'; // default
if (process.argv.includes('--mock')) {
  mode = 'mock';
} else if (process.argv.includes('--prod') || process.env.NODE_ENV === 'production') {
  mode = 'prod';
} else if (process.argv.includes('--dev')) {
  mode = 'dev';
}

// Environment-specific configuration
const ATLAST_API_URL = mode === 'prod'
  ? 'https://atlast.byarielm.fyi'
  : 'http://127.0.0.1:8888';

console.log(`🌍 Building for ${mode} mode`);
console.log(`🔗 API URL: ${ATLAST_API_URL}`);

// Clean dist directory
const distBaseDir = path.join(__dirname, 'dist');
if (fs.existsSync(distBaseDir)) {
  fs.rmSync(distBaseDir, { recursive: true });
}
fs.mkdirSync(distBaseDir, { recursive: true });

// Build configuration base
const buildConfigBase = {
  bundle: true,
  minify: mode === 'prod' && !watch,
  sourcemap: mode !== 'prod' || watch ? 'inline' : false,
  target: 'es2020',
  format: 'esm',
  define: {
    '__ATLAST_API_URL__': JSON.stringify(ATLAST_API_URL),
    '__BUILD_MODE__': JSON.stringify(mode),
  },
  // Include webextension-polyfill in the bundle
  external: [],
};

// Build scripts for a specific browser
function getScripts(browser) {
  const distDir = path.join(distBaseDir, browser);
  return [
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
}

// Build function
async function build() {
  try {
    console.log('🔨 Building extension for Chrome and Firefox...');

    const browsers = ['chrome', 'firefox'];

    for (const browser of browsers) {
      console.log(`\n📦 Building ${browser} version...`);
      const scripts = getScripts(browser);

      // Build all scripts
      for (const config of scripts) {
        if (watch) {
          const ctx = await esbuild.context(config);
          await ctx.watch();
          console.log(`👀 Watching ${browser}/${path.basename(config.entryPoints[0])}...`);
        } else {
          await esbuild.build(config);
          console.log(`✅ Built ${browser}/${path.basename(config.entryPoints[0])}`);
        }
      }

      // Copy static files
      copyStaticFiles(browser);

      // Process CSS with Tailwind
      await processCSS(browser);
    }

    if (!watch) {
      console.log('\n✨ Build complete for both browsers!');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Process CSS with PostCSS (Tailwind + Autoprefixer)
async function processCSS(browser) {
  const cssPath = path.join(__dirname, 'src/popup/popup.css');
  const distDir = path.join(distBaseDir, browser);
  const outputPath = path.join(distDir, 'popup/popup.css');

  const css = fs.readFileSync(cssPath, 'utf8');

  // Import cssnano dynamically for production minification
  const plugins = [tailwindcss, autoprefixer];
  if (mode === 'prod') {
    const cssnano = (await import('cssnano')).default;
    plugins.push(cssnano);
  }

  const result = await postcss(plugins).process(css, {
    from: cssPath,
    to: outputPath,
  });

  // Create directory if it doesn't exist
  const destDir = path.dirname(outputPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, result.css);
  console.log('🎨 Processed CSS with Tailwind');
}

// Copy static files
function copyStaticFiles(browser) {
  const distDir = path.join(distBaseDir, browser);

  const filesToCopy = [
    { from: `manifest.${browser}.json`, to: 'manifest.json', fallback: 'manifest.json' },
    { from: 'src/popup/popup.html', to: 'popup/popup.html' },
  ];

  for (const file of filesToCopy) {
    // Try to use browser-specific file first, fall back to default
    let srcPath = path.join(__dirname, file.from);
    if (file.fallback && !fs.existsSync(srcPath)) {
      srcPath = path.join(__dirname, file.fallback);
    }
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
