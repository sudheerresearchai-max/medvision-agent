/**
 * Direct GitHub Uploader for MedVision Agent.
 * 
 * Uses GitHub REST API to push the entire repository to GitHub without
 * requiring local Git binaries or local RAM overhead.
 * Automatically respects .gitignore (never uploads .env.local).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const IGNORED_PATHS = [
  'node_modules',
  '.next',
  '.venv',
  'venv',
  '__pycache__',
  '.git',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  'package-lock.json',
  'dist',
  'build',
  'out',
  '.vercel',
];

const IGNORED_EXTENSIONS = [
  '.onnx',
  '.pth',
  '.ckpt',
  '.nii',
  '.nii.gz',
  '.dcm',
  '.mhd',
  '.zraw',
  '.tmpdir',
];

function shouldIgnore(relativePath) {
  const parts = relativePath.split(path.sep);
  for (const part of parts) {
    if (IGNORED_PATHS.includes(part) || part.startsWith('..') || part.endsWith('.tmpdir')) {
      return true;
    }
  }
  const ext = path.extname(relativePath).toLowerCase();
  if (IGNORED_EXTENSIONS.includes(ext)) {
    return true;
  }
  return false;
}

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(baseDir, filePath);
    if (shouldIgnore(relativePath)) continue;

    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, baseDir));
    } else {
      results.push({
        path: relativePath.replace(/\\/g, '/'),
        fullPath: filePath,
      });
    }
  }
  return results;
}

export async function uploadToGitHub(token, owner, repo) {
  console.log(`\n🚀 Preparing to upload MedVision Agent to github.com/${owner}/${repo}...`);
  const files = getAllFiles(ROOT_DIR);
  console.log(`📦 Found ${files.length} project files to upload (secrets & caches safely excluded).`);

  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'MedVision-Deployer',
  };

  // 1. Get default branch reference or create initial commit
  const treeItems = [];
  for (const file of files) {
    const content = fs.readFileSync(file.fullPath);
    const base64Content = content.toString('base64');

    // Create blob
    const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: base64Content, encoding: 'base64' }),
    });

    if (!blobRes.ok) {
      const errText = await blobRes.text();
      throw new Error(`Failed to create blob for ${file.path}: ${errText}`);
    }

    const blobData = await blobRes.json();
    treeItems.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
    process.stdout.write(`\r  Uploading files: ${treeItems.length}/${files.length} `);
  }
  console.log('\n✅ All file blobs created.');

  // 2. Create Tree
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tree: treeItems }),
  });
  if (!treeRes.ok) throw new Error(`Failed to create tree: ${await treeRes.text()}`);
  const treeData = await treeRes.json();

  // 3. Create Commit
  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'Initial commit: MedVision Agent complete architecture',
      tree: treeData.sha,
    }),
  });
  if (!commitRes.ok) throw new Error(`Failed to create commit: ${await commitRes.text()}`);
  const commitData = await commitRes.json();

  // 4. Update / Create main branch ref
  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: commitData.sha, force: true }),
  });

  if (!refRes.ok) {
    // If ref doesn't exist, create it
    const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: 'refs/heads/main', sha: commitData.sha }),
    });
    if (!createRefRes.ok) throw new Error(`Failed to create ref: ${await createRefRes.text()}`);
  }

  console.log(`\n🎉 Successfully pushed MedVision Agent to https://github.com/${owner}/${repo} (branch: main)!\n`);
}

// Direct execution CLI
const [token, owner, repo] = process.argv.slice(2);
if (token && owner && repo) {
  uploadToGitHub(token, owner, repo).catch((err) => {
    console.error('❌ Upload failed:', err.message);
    process.exit(1);
  });
}
