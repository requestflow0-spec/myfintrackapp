import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Replace the exact imports
    if (code.includes('"firebase/firestore"')) {
        code = code.replace(/"firebase\/firestore"/g, "'@/appwrite'");
        changed = true;
    }
    if (code.includes("'firebase/firestore'")) {
        code = code.replace(/'firebase\/firestore'/g, "'@/appwrite'");
        changed = true;
    }

    if (changed) {
        // Appwrite polyfill provides these, so we don't need to change the function calls at all
        fs.writeFileSync(filePath, code, 'utf8');
        console.log('Replaced firestore in ' + filePath);
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
walkDir('./src/context/');
walkDir('./src/hooks/');
walkDir('./src/lib/');
