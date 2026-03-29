const fs = require('fs');
const path = require('path');

function replaceImports(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceImports(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Specifically target imports from types directory
      // Match: import { Something } from "../../types";
      content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]([^'"]*types[^'"]*)['"]/g, 'import type { $1 } from "$2"');
      
      fs.writeFileSync(fullPath, content);
      console.log(`Updated ${fullPath}`);
    }
  }
}

replaceImports('./src');
