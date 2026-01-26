export function hexToRgba(hex: string | null | undefined, alpha = 1): string | undefined {
  if (!hex) return undefined;
  let sanitized = hex.trim();
  if (!sanitized) return undefined;
  if (sanitized.startsWith("#")) sanitized = sanitized.slice(1);
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (sanitized.length !== 6) return undefined;

  const numeric = Number.parseInt(sanitized, 16);
  if (Number.isNaN(numeric)) return undefined;

  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


















