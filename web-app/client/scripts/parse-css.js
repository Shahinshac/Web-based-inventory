const fs = require('fs');
const postcss = require('postcss');

const css = fs.readFileSync('src/styles.css', 'utf8');
try {
  postcss().process(css, { from: 'src/styles.css' });
  console.log('PostCSS parsed successfully');
} catch (err) {
  console.error('PostCSS parse error:');
  console.error(err.message);
  if (err.input && err.line) {
    const lines = css.split('\n');
    const start = Math.max(0, err.line - 5);
    const end = Math.min(lines.length, err.line + 5);
    for (let i = start; i < end; i++) {
      console.log(`${i+1}| ${lines[i]}`);
    }
  }
  process.exit(1);
}