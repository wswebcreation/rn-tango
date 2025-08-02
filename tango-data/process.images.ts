// import { intToRGBA, rgbaToInt } from "@jimp/utils";
import { readFileSync, readdirSync } from 'fs';
import { Jimp } from 'jimp';
import { remote } from 'webdriverio';
import getData from '/Users/wimselles/Git/games/tango/node_modules/@wdio/ocr-service/dist/utils/getData.js';

// const files = [
//     './tango-data/thumbnails/tango-001.png',
//     './tango-data/thumbnails/tango-002.png',
//     './tango-data/thumbnails/tango-003.png',
//     './tango-data/thumbnails/tango-004.png',
//     './tango-data/thumbnails/tango-005.png',
//     './tango-data/thumbnails/tango-006.png',
//     './tango-data/thumbnails/tango-007.png',
//     './tango-data/thumbnails/tango-008.png',
//     './tango-data/thumbnails/tango-009.png',
//     './tango-data/thumbnails/tango-010.png',
//     './tango-data/thumbnails/tango-008.png',
//     // The bad images where undo can't be found
//     // './tango-data/thumbnails/tango-166.png',
//     // './tango-data/thumbnails/tango-191.png',
//     // './tango-data/thumbnails/tango-193.png',
//     // './tango-data/thumbnails/tango-194.png',
//     // './tango-data/thumbnails/tango-195.png',
//     // './tango-data/thumbnails/tango-196.png',
//     // './tango-data/thumbnails/tango-197.png',
//     // './tango-data/thumbnails/tango-199.png',
//     // './tango-data/thumbnails/tango-202.png',
//     // './tango-data/thumbnails/tango-204.png',
//     // './tango-data/thumbnails/tango-218.png',
//     // './tango-data/thumbnails/tango-229.png',
//     // './tango-data/thumbnails/tango-262.png',
//     // './tango-data/thumbnails/tango-278.png',
// ];

const files = readdirSync('tango-data/thumbnails/').map(file => `tango-data/thumbnails/${file}`);


async function processImages(): Promise<void> {
    for (const file of files) {
        try {
            const fileName = file.split('/').pop();
            console.log('processing', fileName);
            
            const image = await Jimp.read(file);
            const { width, height } = image.bitmap;
            const puzzleNumber = parseInt(fileName!.split('-')[1].split('.')[0]);
            // const { x, y, w, h } = getCropData(puzzleNumber, width, height);

            const croppedImage = image.crop({ 
                x: width * 0.3, 
                y: height * 0.13, 
                w: width * 0.4, 
                h: height * 0.8 
            });
            
            await croppedImage.write(`./tango-data/cropped/${fileName}`);

            // Now use the visual module to get the Undo text bounds and crop the image from there
            const browser = await remote({ capabilities: { browserName: 'stub' }, automationProtocol: './protocol-stub.js' })
            const options = {
                contrast: 0.25,
                isTesseractAvailable: true,
                language: 'eng',
                ocrImagesPath: '/Users/wimselles/Git/games/tango/tango-data/orc-images',
                haystack: { 
                    x: 0, 
                    y: croppedImage.bitmap.height*0.5, 
                    width: croppedImage.bitmap.width, 
                    height: croppedImage.bitmap.height,
                },
                cliFile: readFileSync(`./tango-data/cropped/${fileName}`).toString('base64')
            }
            
            try {
                const { words } = await getData(browser, options)
                // console.log("words = ", words)
                const undoWord = words.find(word => /undo|unde/i.test(word.text));
                if (undoWord) {
                    const { top, bottom } = undoWord.bbox;
                    croppedImage.crop({
                        x: 0, 
                        y: 0, 
                        w: croppedImage.bitmap.width, 
                        h: top- (bottom-top)
                    })
                    await croppedImage.write(`./tango-data/cropped/${fileName}`)
                } else {
                    console.log(`No undo word found for puzzle ${puzzleNumber}`)
                }
            } catch (ocrError) {
                console.error(`OCR processing failed for ${fileName}:`, ocrError);
                console.log(`Continuing with next image...`);
            }
            
        } catch (error) {
            console.error(`Failed to process ${file}:`, error);
            console.log(`Continuing with next image...`);
        }
    }
}

// Remove the complex findGridBounds and cropGrid functions - they're not needed
// The getCropData function already provides the correct cropping coordinates

/**
 * End
 */

// Execute the function if this file is run directly
if (require.main === module) {
    processImages().catch(console.error);
}