const fs = require('fs');
['src/components/MainApp.tsx', 'src/components/VisualizationCanvas.tsx', 'src/components/SQLEditor.tsx'].forEach(f => {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
  fs.writeFileSync(f, s);
});
