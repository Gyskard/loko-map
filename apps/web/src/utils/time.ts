// Parses an SNCF datetime string into HH:MM.
export const parseSncfTime = (raw: string): string => {
  if (raw.length < 13) return raw;
  return `${raw.slice(9, 11)}:${raw.slice(11, 13)}`;
};
