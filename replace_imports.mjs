import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    if (code.includes('@/firebase')) {
        const result = code.replace(/@\/firebase/g, '@/appwrite');
        fs.writeFileSync(filePath, result, 'utf8');
        console.log('Replaced in ' + filePath);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            replaceInFile(fullPath);
        }
    }
}

walkDir('./src/app/');
walkDir('./src/components/');
walkDir('./src/hooks/');
