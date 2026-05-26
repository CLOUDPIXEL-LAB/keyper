const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'post.md',
  'README.md',
  'MULTI_USER_PLAN.md',
  'OVERVIEW.md',
  'website/src/content/docs/reference/known-gaps.md',
  'website/src/content/docs/reference/configuration.md',
  'website/src/content/docs/getting-started/overview.md',
  'website/src/content/docs/getting-started/install-and-run.md'
];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/1\.1\.1/g, '1.1.2');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  } else {
    console.log('Not found: ' + file);
  }
}
