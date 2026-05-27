const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');

function walk(directory) {
  let results = [];
  const list = fs.readdirSync(directory);
  list.forEach(file => {
    file = path.join(directory, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(dir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Fix Logo text
  content = content.replace(/text-white font-sans/g, 'text-foreground font-sans');

  // Fix Tags
  content = content.replace(/bg-cyan-900\/50 hover:bg-cyan-800\/50 text-cyan-300 border-cyan-700/g, 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border-cyan-300 dark:bg-cyan-900/50 dark:hover:bg-cyan-800/50 dark:text-cyan-300 dark:border-cyan-700');
  content = content.replace(/bg-cyan-900\/50 text-cyan-300 border-cyan-700/g, 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-700');

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
