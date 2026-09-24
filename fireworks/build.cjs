const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = __dirname;
const workspace = process.env.NODE_WORKSPACE || path.join(process.env.USERPROFILE, '.workbuddy', 'binaries', 'node', 'workspace');
let esbuild;
try { esbuild = require('esbuild'); } catch { esbuild = createRequire(path.join(workspace, 'package.json'))('esbuild'); }
(async () => {
  const result = await esbuild.build({ entryPoints: [path.join(root, 'src', 'main.js')], bundle: true, format: 'iife', platform: 'browser', target: 'es2020', minify: true, write: false, nodePaths: [path.join(workspace, 'node_modules')], legalComments: 'inline' });
  const template = fs.readFileSync(path.join(root, 'src', 'template.html'), 'utf8');
  const html = template.replace('__BUNDLED_CODE__', () => result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
  fs.writeFileSync(path.join(root, 'index.html'), html);
  console.log(JSON.stringify({ file: path.join(root, 'index.html'), bytes: Buffer.byteLength(html), offline: true }));
})().catch(error => { console.error(error); process.exit(1); });
