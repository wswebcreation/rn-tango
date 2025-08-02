const path = require('path');
const cv = require('@u4/opencv4nodejs');
const fs = require('fs');

// Symbol configuration - easy to enable/disable and adjust thresholds
const symbols = {
  X: {
    enabled: true,
    method: 'text', // 'text' for OpenCV text detection, 'shape' for geometric detection, 'template' for template matching
    minSize: 5, // Minimum size for X detection
    maxSize: 100, // Maximum size for X detection
    textChar: 'X', // Character to look for
  },
  '=': {
    enabled: false,
    method: 'template', // template matching for = symbol
    templateFile: '=.png',
    threshold: 0.7,
    template: null
  }
};

// Load template images for enabled symbols that use template method
for (const [symbolName, config] of Object.entries(symbols)) {
  if (config.enabled && config.method === 'template') {
    config.template = cv.imread(path.resolve(config.templateFile)).bgrToGray();
    console.log(`Loaded template for ${symbolName} symbol with threshold ${config.threshold}`);
  } else if (config.enabled && config.method === 'shape') {
    console.log(`Using shape detection for ${symbolName} symbol (size: ${config.minSize}-${config.maxSize})`);
  } else if (config.enabled && config.method === 'text') {
    console.log(`Using text detection for '${config.textChar}' character (size: ${config.minSize}-${config.maxSize})`);
  } else {
    console.log(`Skipping disabled symbol: ${symbolName}`);
  }
}

const files = [
  'cropped/tango-001.png',
  // 'cropped/tango-002.png',
  // 'cropped/tango-003.png',
  // 'cropped/tango-004.png',
  // 'cropped/tango-005.png',
  // 'cropped/tango-006.png',
  // 'cropped/tango-007.png',
  // 'cropped/tango-008.png'
];

// Ensure highlighted directory exists
if (!fs.existsSync('highlighted')) {
  fs.mkdirSync('highlighted');
}

function detectTextCharacters(imagePath, config) {
  const img = cv.imread(path.resolve(imagePath));
  const gray = img.bgrToGray();
  const matches = [];
  
  console.log(`  Analyzing image for text character '${config.textChar}' dimensions: ${img.cols}x${img.rows}`);
  
  try {
    // Simple approach: Look for character-like blobs using morphological operations
    
    // Apply threshold to get binary image
    const binary = gray.threshold(0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
    
    // Create morphological kernel for text detection
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    
    // Apply morphological operations to clean up the image
    const morph = binary.morphologyEx(kernel, cv.MORPH_CLOSE);
    
    // Find contours
    const contours = morph.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    console.log(`  Found ${contours.length} potential text regions`);
    
    let sizeFiltered = 0;
    let aspectFiltered = 0;
    let densityFiltered = 0;
    
    for (const contour of contours) {
      const boundingRect = contour.boundingRect();
      const { width, height, x, y } = boundingRect;
      
      // Filter by size
      if (width < config.minSize || height < config.minSize || 
          width > config.maxSize || height > config.maxSize) {
        sizeFiltered++;
        continue;
      }
      
      // Check aspect ratio for character-like shapes
      const aspectRatio = width / height;
      if (aspectRatio < 0.3 || aspectRatio > 3.0) {
        aspectFiltered++;
        continue;
      }
      
      // Calculate density of the region (how much of the bounding box is filled)
      // Use bounding rect area as approximation since contourArea might not be available
      const area = width * height;
      const roi = morph.getRegion(boundingRect);
      const nonZeroPixels = cv.countNonZero(roi);
      const density = nonZeroPixels / area;
      
      // For text characters, we expect a certain density
      if (density < 0.1 || density > 0.9) {
        densityFiltered++;
        continue;
      }
      
      console.log(`    Text candidate: ${width}x${height}, aspect: ${aspectRatio.toFixed(2)}, density: ${density.toFixed(3)}`);
      
      matches.push({
        x: x,
        y: y,
        width: width,
        height: height,
        confidence: density
      });
    }
    
    console.log(`  Filtered: ${sizeFiltered} by size, ${aspectFiltered} by aspect ratio, ${densityFiltered} by density`);
    console.log(`  Text matches for '${config.textChar}' in ${imagePath}:`, matches.length, 'with densities:', matches.map(m => m.confidence.toFixed(3)));
    
  } catch (error) {
    console.error(`  Error in text detection: ${error.message}`);
  }
  
  return matches;
}

function detectXShapes(imagePath, config) {
  const img = cv.imread(path.resolve(imagePath)).bgrToGray();
  const matches = [];
  
  console.log(`  Analyzing image dimensions: ${img.cols}x${img.rows}`);
  
  // Apply threshold to get binary image
  const binary = img.threshold(0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
  
  // Find contours
  const contours = binary.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  console.log(`  Found ${contours.length} contours`);
  
  let sizeFiltered = 0;
  let aspectFiltered = 0;
  let diagonalFiltered = 0;
  
  for (const contour of contours) {
    const boundingRect = contour.boundingRect();
    const { width, height } = boundingRect;
    
    // Filter by size
    if (width < config.minSize || height < config.minSize || 
        width > config.maxSize || height > config.maxSize) {
      sizeFiltered++;
      continue;
    }
    
    // Check if it's roughly square (X should be in a square-ish bounding box)
    const aspectRatio = width / height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) { // More lenient aspect ratio
      aspectFiltered++;
      continue;
    }
    
    // Extract the region of interest
    const roi = img.getRegion(boundingRect);
    const roiBinary = roi.threshold(0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    
    // Check for X-like pattern by looking at diagonal pixel density
    let diagonalPixels = 0;
    let totalPixels = 0;
    
    // Count pixels along both diagonals
    for (let i = 0; i < Math.min(width, height); i++) {
      const x1 = i, y1 = i; // Main diagonal
      const x2 = width - 1 - i, y2 = i; // Anti-diagonal
      
      if (x1 < width && y1 < height && roiBinary.at(y1, x1) === 0) diagonalPixels++; // Black pixel
      if (x2 < width && y2 < height && roiBinary.at(y2, x2) === 0) diagonalPixels++; // Black pixel
      totalPixels += 2;
    }
    
    // If enough diagonal pixels are found, it might be an X
    const diagonalRatio = diagonalPixels / totalPixels;
    console.log(`    Candidate: ${width}x${height}, aspect: ${aspectRatio.toFixed(2)}, diagonal: ${diagonalRatio.toFixed(3)}`);
    
    if (diagonalRatio > 0.15) { // Lower threshold to be more permissive
      matches.push({
        x: boundingRect.x,
        y: boundingRect.y,
        width: boundingRect.width,
        height: boundingRect.height,
        confidence: diagonalRatio
      });
    } else {
      diagonalFiltered++;
    }
  }
  
  console.log(`  Filtered: ${sizeFiltered} by size, ${aspectFiltered} by aspect ratio, ${diagonalFiltered} by diagonal pattern`);
  console.log(`  X shape matches in ${imagePath}:`, matches.length, 'with confidences:', matches.map(m => m.confidence.toFixed(3)));
  return matches;
}

function matchSymbols(imagePath, template, symbolName, threshold) {
  const img = cv.imread(path.resolve(imagePath)).bgrToGray();
  const result = img.matchTemplate(template, cv.TM_CCOEFF_NORMED);

  const matches = [];
  const minDistance = Math.min(template.rows, template.cols) / 2; // Minimum distance between matches

  while (true) {
    const { maxVal, maxLoc } = result.minMaxLoc();
    if (maxVal < threshold) break;

    // Check if this match is too close to existing matches
    const isTooClose = matches.some(existingMatch => {
      const distance = Math.sqrt(
        Math.pow(maxLoc.x - existingMatch.x, 2) + 
        Math.pow(maxLoc.y - existingMatch.y, 2)
      );
      return distance < minDistance;
    });

    if (!isTooClose) {
      matches.push({
        x: maxLoc.x,
        y: maxLoc.y,
        width: template.cols,
        height: template.rows,
        confidence: maxVal
      });
    }

    // Mask matched region to avoid duplicate detection
    const topLeft = maxLoc;
    const bottomRight = new cv.Point(
      topLeft.x + template.cols,
      topLeft.y + template.rows
    );

    // Draw black rectangle over matched area in result matrix
    result.drawRectangle(topLeft, bottomRight, new cv.Vec(0, 0, 0), -1, cv.LINE_8);
  }

  console.log(`${symbolName} matches in ${imagePath}:`, matches.length, 'with confidences:', matches.map(m => m.confidence.toFixed(3)));
  return matches;
}

async function createHighlightedImage(imagePath, xMatches, eqMatches, Jimp, intToRGBA, rgbaToInt) {
  try {
    // Load the original image with Jimp
    const image = await Jimp.read(path.resolve(imagePath));
    
    // Create a transparent green color (RGBA: 0, 255, 0, 128 for 50% transparency)
    const highlightColor = { r: 0, g: 255, b: 0, a: 0.5 };
    
    // Combine all matches
    const allMatches = [...xMatches, ...eqMatches];
    
    // Draw rectangles for all matches
    allMatches.forEach(match => {
      const { x, y, width, height } = match;
      
      // Apply the semi-transparent highlight
      for (let py = y; py < y + height; py++) {
        for (let px = x; px < x + width; px++) {
          // Get the current pixel color
          const currentColor = image.getPixelColor(px, py);
          const rgba = intToRGBA(currentColor);
          
          // Calculate new color values using simple alpha blending
          const newR = (highlightColor.r * highlightColor.a) + (rgba.r * (1 - highlightColor.a));
          const newG = (highlightColor.g * highlightColor.a) + (rgba.g * (1 - highlightColor.a));
          const newB = (highlightColor.b * highlightColor.a) + (rgba.b * (1 - highlightColor.a));
          const newA = rgba.a; // Use original alpha to maintain image integrity

          // Set the new pixel color
          image.setPixelColor(rgbaToInt(newR, newG, newB, newA), px, py);
        }
      }
    });
    
    // Extract filename and create highlighted version path
    const filename = path.basename(imagePath);
    const highlightedPath = path.join('highlighted', filename);
    
    // Save the highlighted image
    await image.write(highlightedPath);
    console.log(`Highlighted image saved: ${highlightedPath}`);
    
  } catch (error) {
    console.error(`Error creating highlighted image for ${imagePath}:`, error);
  }
}

async function main() {
  // Initialize Jimp using dynamic import with proper destructuring
  const { Jimp } = await import('jimp');
  const { intToRGBA, rgbaToInt } = await import("@jimp/utils");

  console.log('\n=== Symbol Detection Results ===');

  for (const file of files) {
    const filename = path.basename(file);
    console.log(`\n${filename}:`);
    
    const allMatches = {};
    const imageCounts = {};
    
    // Process each enabled symbol
    for (const [symbolName, config] of Object.entries(symbols)) {
      if (config.enabled) {
        let matches;
        if (config.method === 'text') {
          matches = detectTextCharacters(file, config);
        } else if (config.method === 'shape') {
          matches = detectXShapes(file, config);
        } else if (config.method === 'template') {
          matches = matchSymbols(file, config.template, symbolName, config.threshold);
        } else {
          matches = [];
        }
        
        allMatches[symbolName] = matches;
        imageCounts[symbolName] = matches.length;
        console.log(`  ${symbolName}: ${matches.length} found`);
      } else {
        allMatches[symbolName] = [];
        imageCounts[symbolName] = 0;
      }
    }
    
    // Create highlighted version with detected matches
    const allMatchesFlat = Object.values(allMatches).flat();
    await createHighlightedImage(file, allMatchesFlat, [], Jimp, intToRGBA, rgbaToInt);
  }
}

main().catch(console.error);
