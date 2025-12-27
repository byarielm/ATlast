import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const watch = process.argv.includes('--watch');
const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const mode = isProd ? 'production' : 'development';

// Environment-specific configuration
const ATLAST_API_URL = mode === 'production'
  ? 'https://atlast.byarielm.fyi'
  : 'http://127.0.0.1:8888';

console.log(`🌍 Building for ${mode} mode`);
console.log(`🔗 API URL: ${ATLAST_API_URL}`);

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
  define: {
    '__ATLAST_API_URL__': JSON.stringify(ATLAST_API_URL),
    '__BUILD_MODE__': JSON.stringify(mode),
  },
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

    // Process CSS with Tailwind
    await processCSS();

    if (!watch) {
      console.log('✨ Build complete!');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Process CSS with PostCSS (Tailwind + Autoprefixer)
async function processCSS() {
  const cssPath = path.join(__dirname, 'src/popup/popup.css');
  const outputPath = path.join(distDir, 'popup/popup.css');

  const css = fs.readFileSync(cssPath, 'utf8');

  // Import cssnano dynamically for production minification
  const plugins = [tailwindcss, autoprefixer];
  if (isProd) {
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
function copyStaticFiles() {
  const filesToCopy = [
    { from: 'manifest.json', to: 'manifest.json' },
    { from: 'src/popup/popup.html', to: 'popup/popup.html' },
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
