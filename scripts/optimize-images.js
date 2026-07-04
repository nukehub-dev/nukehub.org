import sharp from 'sharp';
import { glob } from 'glob';
import fs from 'fs/promises';

async function optimize() {
  const images = await glob('public/**/*.{png,jpg,jpeg}');
  console.log(`Found ${images.length} images to optimize...`);

  for (const imgPath of images) {
    try {
      const buffer = await sharp(imgPath)
        .png({ quality: 80, palette: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      
      const oldSize = (await fs.stat(imgPath)).size;
      await fs.writeFile(imgPath, buffer);
      const newSize = (await fs.stat(imgPath)).size;
      
      const savings = ((oldSize - newSize) / oldSize * 100).toFixed(2);
      console.log(`Optimized ${imgPath}: ${Math.round(oldSize/1024)}KB -> ${Math.round(newSize/1024)}KB (${savings}% saved)`);
    } catch (err) {
      console.error(`Error optimizing ${imgPath}:`, err);
    }
  }
  console.log('Optimization complete!');
}

optimize();
