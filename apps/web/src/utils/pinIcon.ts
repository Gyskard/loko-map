export const pinIcon = (color: string): string => {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">` +
      `<path d="M20 1C9.5 1 1 9.5 1 20C1 33 20 51 20 51C20 51 39 33 39 20C39 9.5 30.5 1 20 1Z" fill="${color}"/>` +
      `<circle cx="20" cy="20" r="13" fill="white"/>` +
      `<rect x="12" y="14" width="16" height="10" rx="2" fill="${color}"/>` +
      `<rect x="14" y="16" width="4" height="3" rx="1" fill="white"/>` +
      `<rect x="22" y="16" width="4" height="3" rx="1" fill="white"/>` +
      `<rect x="11" y="25" width="18" height="2" rx="1" fill="${color}"/>` +
      `</svg>`,
  )}`;
};
