'use strict';
// thunder — inline line-icon set (stroke, 24x24, inherits currentColor).
// standalone copies of each icon also live in /public/icons.

const icons = {
  bolt: '<path d="M13 2 L4.5 13.5 H10.5 L9 22 L19.5 9.5 H12.5 Z" stroke-linejoin="round"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21 L16.2 16.2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 15.5 L16 10.5 L6 20"/>',
  news: '<path d="M3 5 h13 v12 a2 2 0 0 0 2 2 H5 a2 2 0 0 1 -2 -2 Z"/><path d="M16 9 h3.5 a1.5 1.5 0 0 1 1.5 1.5 V17 a2 2 0 0 1 -2 2"/><path d="M6.5 9 h6 M6.5 12.5 h6 M6.5 16 h4"/>',
  shield: '<path d="M12 2.5 L20 6 V12 C20 16.8 16.6 20.4 12 21.8 C7.4 20.4 4 16.8 4 12 V6 Z"/>',
  gear: '<path d="M4 7 h16 M4 12 h16 M4 17 h16"/><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="2" fill="currentColor" stroke="none"/>',
  speech: '<path d="M21 14.5 a2 2 0 0 1 -2 2 H8 l-4.5 4 V5 a2 2 0 0 1 2 -2 H19 a2 2 0 0 1 2 2 Z"/>',
  ghost: '<path d="M12 3 a7 7 0 0 0 -7 7 V20.5 l3 -2 2 2 2 -2 2 2 2 -2 3 2 V10 a7 7 0 0 0 -7 -7 Z"/><circle cx="9.5" cy="10.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10.5" r="0.9" fill="currentColor" stroke="none"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12 h18 M12 3 c3 3.5 3 14.5 0 18 M12 3 c-3 3.5 -3 14.5 0 18"/>',
  heart: '<path d="M12 20.5 C 5.5 15.8 3.5 11 6 7.8 c1.9 -2.4 5 -2.2 6 0.7 1 -2.9 4.1 -3.1 6 -0.7 2.5 3.2 0.5 8 -6 12.7 Z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5 V7.5 a4 4 0 0 1 8 0 v3"/>',
  sparkle: '<path d="M12 3.5 l1.9 5.6 5.6 1.9 -5.6 1.9 -1.9 5.6 -1.9 -5.6 -5.6 -1.9 5.6 -1.9 Z" stroke-linejoin="round"/>',
  leaf: '<path d="M5 19 C 5 10 11 5 20 4.5 C 19.5 14 14.5 19.5 6.5 19 Z" stroke-linejoin="round"/><path d="M5 19 C 9 14 12.5 11.5 16 9.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5 v2 M12 19.5 v2 M2.5 12 h2 M19.5 12 h2 M5 5 l1.5 1.5 M17.5 17.5 L19 19 M19 5 l-1.5 1.5 M6.5 17.5 L5 19"/>',
  moon: '<path d="M20.5 13.5 A8.5 8.5 0 1 1 10.5 3.5 a7 7 0 0 0 10 10 Z" stroke-linejoin="round"/>',
  link: '<path d="M10.5 13.5 a4.5 4.5 0 0 0 6.8.5 l2.6 -2.6 a4.5 4.5 0 0 0 -6.4 -6.4 l-1.4 1.4"/><path d="M13.5 10.5 a4.5 4.5 0 0 0 -6.8 -.5 l-2.6 2.6 a4.5 4.5 0 0 0 6.4 6.4 l1.4 -1.4"/>',
  play: '<path d="M8 5.5 v13 l10.5 -6.5 Z" stroke-linejoin="round"/>',
  shuffle: '<path d="M16 3.5 h4.5 V8 M20.5 3.5 L4 20 M20.5 16 v4.5 H16 M14.5 14.5 l6 6 M4 4 l6 6"/>',
};

function icon(name, cls = '', size = 20) {
  const body = icons[name] || icons.sparkle;
  return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${body}</svg>`;
}

module.exports = { icon, icons };
