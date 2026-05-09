// One-shot: repair common UTF-8 → cp1252 mojibake in a file.
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) { console.error('usage: node fix-mojibake.mjs <file>'); process.exit(1); }

const before = readFileSync(path, 'utf8');
const map = [
  ['â€”', '—'],  // â€" → —
  ['â€“', '–'],  // â€" → –
  ['â€¢', '•'],  // â€¢ → •
  ['â†’', '→'],  // â†' → →
  ['â€˜', '‘'],  // â€˜ → '
  ['â€™', '’'],  // â€™ → '
  ['â€œ', '“'],  // â€œ → "
  ['â€', '”'],        // â€  → " (catch-all; do last)
  ['â”€', '─'],  // â"€ → ─
  ['â‰¤', '≤'],  // â‰¤ → ≤
  ['â™¿', '♿'],  // accessibility wheelchair
  ['ðŸ”Œ', '🔌'], // electric plug
  ['âš¡', '⚡'],  // lightning bolt
  ['ðŸ”', '🔍'], // magnifying glass
  ['ðŸ"…', '📅'], // calendar
  ['ðŸŒ—', '🌗'], // moon
  ['â†”', '↔'],  // left-right arrow
  ['âŒ¨', '⌨'],  // keyboard
  ['ðŸŽ¨', '🎨'], // palette
  ['ðŸ"', '🔌'], // (variant)
  ['Â·', '·'],  // middle dot
  ['â—', '◯'],  // circle
];
let out = before;
for (const [bad, good] of map) out = out.split(bad).join(good);

writeFileSync(path, out, 'utf8');

const remaining = (out.match(/â€/g) || []).length;
console.log(`fixed: ${path}`);
console.log(`remaining "â€" sequences: ${remaining}`);
