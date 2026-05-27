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

  content = content.replace(/bg-neutral-800\/70/g, 'bg-muted/70');
  content = content.replace(/bg-neutral-800\/50/g, 'bg-muted/50');
  content = content.replace(/bg-neutral-800/g, 'bg-muted');
  
  content = content.replace(/border-neutral-600/g, 'border-input');
  
  content = content.replace(/hover:bg-neutral-700/g, 'hover:bg-accent hover:text-accent-foreground');
  
  content = content.replace(/text-neutral-200/g, 'text-foreground');
  
  content = content.replace(/bg-white hover:bg-neutral-200 text-black/g, 'bg-primary text-primary-foreground hover:bg-primary/90');
  
  content = content.replace(/bg-neutral-700/g, 'bg-muted');

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
