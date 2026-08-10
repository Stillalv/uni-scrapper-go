import * as icons from '@mynaui/icons-react';

const iconsNeeded = [
  'CheckCircle',
  'DangerTriangle',
  'XCircle',
  'Info',
  'X',
  'ClockWaves',
  'Search',
  'TrashTwo',
  'LayersTwo',
  'Folder',
  'Copy',
  'Lightning',
  'Zap',
  'DangerOctagon',
  'BookOpen'
];

for (const name of iconsNeeded) {
  if (!icons[name]) {
    console.error(`MISSING ICON: ${name}`);
  } else {
    console.log(`OK: ${name}`);
  }
}
