// generate-missing-icons.js
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const iconDir = 'public/icons';
  const source192 = path.join(iconDir, 'android-icon-192x192.png');
  
  if (!fs.existsSync(source192)) {
    console.error('Source icon not found:', source192);
    process.exit(1);
  }
  
  console.log('📦 Generating missing PWA icons...\n');
  
  try {
    // Generate 512x512 from 192x192
    await sharp(source192)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(iconDir, 'icon-512x512.png'));
    console.log('✅ Generated: icon-512x512.png');
    
    // Use 192x192 as is (rename for PWA)
    fs.copyFileSync(source192, path.join(iconDir, 'icon-192x192.png'));
    console.log('✅ Generated: icon-192x192.png');
    
    // Create maskable variants (same for now)
    fs.copyFileSync(source192, path.join(iconDir, 'icon-maskable-192x192.png'));
    console.log('✅ Generated: icon-maskable-192x192.png');
    
    await sharp(source192)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(iconDir, 'icon-maskable-512x512.png'));
    console.log('✅ Generated: icon-maskable-512x512.png');
    
    // Generate screenshots
    // Screenshot 1: 540x720 (mobile)
    const screenshot1 = Buffer.alloc(540 * 720 * 4);
    for (let i = 0; i < screenshot1.length; i += 4) {
      screenshot1[i] = 59;     // R
      screenshot1[i + 1] = 130; // G
      screenshot1[i + 2] = 246; // B
      screenshot1[i + 3] = 255; // A
    }
    await sharp(screenshot1, {
      raw: { width: 540, height: 720, channels: 4 }
    }).png().toFile(path.join(iconDir, 'screenshot-1.png'));
    console.log('✅ Generated: screenshot-1.png (540x720)');
    
    // Screenshot 2: 1280x720 (desktop)
    const screenshot2 = Buffer.alloc(1280 * 720 * 4);
    for (let i = 0; i < screenshot2.length; i += 4) {
      screenshot2[i] = 59;
      screenshot2[i + 1] = 130;
      screenshot2[i + 2] = 246;
      screenshot2[i + 3] = 255;
    }
    await sharp(screenshot2, {
      raw: { width: 1280, height: 720, channels: 4 }
    }).png().toFile(path.join(iconDir, 'screenshot-2.png'));
    console.log('✅ Generated: screenshot-2.png (1280x720)');
    
    console.log('\n🎉 All icons generated successfully!');
    console.log('📂 Location: public/icons/');
    console.log('\n✨ You can now run: npm run build');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
