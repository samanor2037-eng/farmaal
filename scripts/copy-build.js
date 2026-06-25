const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, '../dist-electron/Farmaal_Desktop.exe');
const destDir = path.join(__dirname, '../public/downloads');
const destFile = path.join(destDir, 'Farmaal_Desktop.exe');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Check if source file exists
if (fs.existsSync(srcFile)) {
  console.log(`Copying built executable from ${srcFile} to ${destFile}...`);
  fs.copyFileSync(srcFile, destFile);
  console.log('Successfully copied executable to public downloads directory!');
} else {
  console.error(`Error: Built executable not found at ${srcFile}. Make sure 'npm run electron:build' completed successfully.`);
}
