const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration - use process.cwd() and relative paths
const SCRIPT_DIR = path.dirname(require.main.filename);
const JSON_FILE_PATH = path.join(SCRIPT_DIR, 'tango-thumbnails.json');
const OUTPUT_DIR = path.join(SCRIPT_DIR, 'thumbnails');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created directory: ${OUTPUT_DIR}`);
}

// Read and parse the JSON file
function loadThumbnailData() {
  try {
    const jsonData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    return JSON.parse(jsonData);
  } catch (error) {
    console.error('Error reading JSON file:', error.message);
    process.exit(1);
  }
}

// Download a single file
function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(OUTPUT_DIR, filename);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`Skipping ${filename} - already exists`);
      resolve();
      return;
    }

    const protocol = url.startsWith('https:') ? https : http;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded: ${filename}`);
        resolve();
      });

      fileStream.on('error', (error) => {
        fs.unlink(filePath, () => {}); // Delete the file if there was an error
        reject(error);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

// Download all thumbnails with concurrency control
async function downloadAllThumbnails(thumbnails, maxConcurrent = 5) {
  console.log(`Starting download of ${thumbnails.length} thumbnails...`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Max concurrent downloads: ${maxConcurrent}`);
  console.log('---');

  const startTime = Date.now();
  let completed = 0;
  let failed = 0;
  const errors = [];

  // Process thumbnails in batches
  for (let i = 0; i < thumbnails.length; i += maxConcurrent) {
    const batch = thumbnails.slice(i, i + maxConcurrent);
    
    const promises = batch.map(async (thumbnail) => {
      try {
        await downloadFile(thumbnail.url, thumbnail.filename);
        completed++;
      } catch (error) {
        failed++;
        errors.push(`${thumbnail.filename}: ${error.message}`);
        console.error(`Failed to download ${thumbnail.filename}:`, error.message);
      }
    });

    await Promise.all(promises);
    
    // Progress update
    const progress = Math.min(i + maxConcurrent, thumbnails.length);
    console.log(`Progress: ${progress}/${thumbnails.length} (${Math.round(progress/thumbnails.length*100)}%)`);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n--- Download Summary ---');
  console.log(`Total thumbnails: ${thumbnails.length}`);
  console.log(`Successfully downloaded: ${completed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  
  if (errors.length > 0) {
    console.log('\n--- Errors ---');
    errors.forEach(error => console.log(error));
  }
}

// Main execution
async function main() {
  try {
    const thumbnails = loadThumbnailData();
    console.log(`Loaded ${thumbnails.length} thumbnail entries from JSON file`);
    
    await downloadAllThumbnails(thumbnails);
    
    console.log('\nDownload process completed!');
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { downloadAllThumbnails, loadThumbnailData }; 