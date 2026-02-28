import fs from 'fs';

const filePath = 'src/pages/Reconciliation.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// The file is huge, replacing it wholesale ensures everything is correct.
console.log("File loaded.");
