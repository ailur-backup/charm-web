let fs = require('fs');
let path = require('path');

const nodeBase = path.resolve(__dirname, '..')
const distDir = path.join(nodeBase, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

const htmlDir = path.join(nodeBase, 'src', 'html');
const htmlFiles = fs.readdirSync(htmlDir).filter(file => file.endsWith('.html'));
for (let file of htmlFiles) {
    const fileName = file.split('.').slice(0, -1).join('.');
    const destDir = path.join(distDir, fileName);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
    }
    const source = path.join(htmlDir, file);
    const dest = path.join(destDir, "index.html");
    fs.copyFileSync(source, dest);
    console.log(`Copied ${file} to ${dest}`);
}

const cssDir = path.join(nodeBase, 'src', 'css');
const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
const cssDestDir = path.join(distDir, 'static', 'css');
if (!fs.existsSync(cssDestDir)) {
    fs.mkdirSync(cssDestDir, { recursive: true });
}
for (let file of cssFiles) {
    const source = path.join(cssDir, file);
    const dest = path.join(cssDestDir, file);
    fs.copyFileSync(source, dest);
    console.log(`Copied ${file} to ${dest}`);
}

const svgDir = path.join(nodeBase, 'src', 'svg');
const svgFiles = fs.readdirSync(svgDir).filter(file => file.endsWith('.svg'));
const svgDestDir = path.join(distDir, 'static', 'svg');
if (!fs.existsSync(svgDestDir)) {
    fs.mkdirSync(svgDestDir, { recursive: true });
}
for (let file of svgFiles) {
    const source = path.join(svgDir, file);
    const dest = path.join(svgDestDir, file);
    fs.copyFileSync(source, dest);
    console.log(`Copied ${file} to ${dest}`);
}