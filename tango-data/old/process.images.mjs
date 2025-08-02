import { intToRGBA, rgbaToInt } from "@jimp/utils";
import { Jimp } from 'jimp';

const files = [
    'thumbnails/tango-001.png',
    // 'thumbnails/tango-002.png',
    // 'thumbnails/tango-003.png',
    // 'thumbnails/tango-004.png',
    // 'thumbnails/tango-005.png',
    // 'thumbnails/tango-006.png',
    // 'thumbnails/tango-007.png',
    // 'thumbnails/tango-008.png',
    // 'thumbnails/tango-009.png',
    // 'thumbnails/tango-010.png',
]

// const files = readdirSync('thumbnails/').map(file => `thumbnails/${file}`);

function getCropData(puzzleNumber, width, height) {
    let x, y, w, h;
    if (puzzleNumber > 171 && puzzleNumber < 204) {
        x = width * 0.315;
        y = height * 0.18;
        w = width * 0.365;
        h = height * 0.635;
    } else if (puzzleNumber > 234 && puzzleNumber < 278) {
        x = width * 0.36;
        y = height * 0.18;
        w = width * 0.28;
        h = height * 0.49;
    } else if (puzzleNumber === 278) {
        x = width * 0.38;
        y = height * 0.26;
        w = width * 0.25;
        h = height * 0.435;
    } else if (puzzleNumber < 4) {
        x = width * 0.32;
        y = height * 0.17;
        w = width * 0.35;
        h = height * 0.62;
    }  else if(puzzleNumber === 13){
        x = width * 0.36;
        y = height * 0.125;
        w = width * 0.28;
        h = height * 0.5;
    }  else if(puzzleNumber === 21){
        x = width * 0.36;
        y = height * 0.15;
        w = width * 0.28;
        h = height * 0.5;
    }  else if (puzzleNumber > 82 && puzzleNumber < 91) {
        x = width * 0.34;
        y = height * 0.15;
        w = width * 0.32;
        h = height * 0.54;
    } else if(puzzleNumber > 129 && puzzleNumber < 132) {
        x = width * 0.34;
        y = height * 0.15;
        w = width * 0.32;
        h = height * 0.57;
    }  else if(puzzleNumber === 204){
        x = width * 0.33;
        y = height * 0.19;
        w = width * 0.34;
        h = height * 0.62;
    } else if(puzzleNumber === 225) {
        x = width * 0.35;
        y = height * 0.13;
        w = width * 0.32;
        h = height * 0.55;
    }else if(puzzleNumber === 227) {
        x = width * 0.34;
        y = height * 0.2;
        w = width * 0.32;
        h = height * 0.55;
    } else if (puzzleNumber >93 && puzzleNumber < 113){
        x = width * 0.34;
        y = height * 0.15;
        w = width * 0.32;
        h = height * 0.55;
    } else if (puzzleNumber > 229 && puzzleNumber < 235){
        x = width * 0.34;
        y = height * 0.2;
        w = width * 0.32;
        h = height * 0.55;
    } else {
        x = width * 0.34;
        y = height * 0.15;
        w = width * 0.32;
        h = height * 0.57;
    }
    return { x, y, w, h };
}

async function drawHighlightedWords({ filePath, highlights }) {
    try {
        const image = await Jimp.read(filePath)
        const highlightColor = { r: 57, g: 170, b: 86, a: 0.5 }

        highlights.forEach(({ left, right, top, bottom }) => {
            const width = right - left
            const height = bottom - top

            // Apply the semi-transparent highlight
            for (let y = top; y < top + height; y++) {
                for (let x = left; x < left + width; x++) {
                    // Get the current pixel color
                    const currentColor = image.getPixelColor(x, y)
                    const rgba = intToRGBA(currentColor)
                    // Calculate new color values using simple alpha blending
                    const newR = (highlightColor.r * highlightColor.a) + (rgba.r * (1 - highlightColor.a))
                    const newG = (highlightColor.g * highlightColor.a) + (rgba.g * (1 - highlightColor.a))
                    const newB = (highlightColor.b * highlightColor.a) + (rgba.b * (1 - highlightColor.a))
                    const newA = rgba.a // Use original alpha to maintain image integrity

                    // Set the new pixel color
                    image.setPixelColor(rgbaToInt(newR, newG, newB, newA), x, y)
                }
            }
        })

        await image.write(filePath)
    } catch (error) {
        console.log('Failed to highlight words on image:', error)
    }
}

function drawGrid(image, width, height) {
    const gridColor = 0x000000FF; // Black color
    
    // Draw vertical lines
    for (let i = 1; i < 6; i++) {
        const x = Math.floor(i * width / 6);
        for (let y = 0; y < height; y++) {
            image.setPixelColor(gridColor, x, y);
        }
    }
    
    // Draw horizontal lines
    for (let j = 1; j < 6; j++) {
        const y = Math.floor(j * height / 6);
        for (let x = 0; x < width; x++) {
            image.setPixelColor(gridColor, x, y);
        }
    }
}

for (const file of files) {
    const fileName = file.split('/').pop();
    console.log('processing', fileName);
    const image = await Jimp.read(file);
    const { width, height } = image.bitmap;
    const puzzleNumber = parseInt(fileName.split('-')[1].split('.')[0]);
    const { x, y, w, h } = getCropData(puzzleNumber, width, height);
    const croppedImage = image.crop({x, y, w, h});
    croppedImage.greyscale();
    croppedImage.contrast(1);
    
    // drawGrid(croppedImage, w, h);
    
    await croppedImage.write(`./cropped/${fileName}`);
    
}