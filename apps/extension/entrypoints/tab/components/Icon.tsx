// Glyphs render from the SVG files under public/assets/icons via CSS mask
// (background-color: currentColor), so the palette flows in without copying
// path data into TS — see docs/guides/icons.md for sourcing and traceability.
export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const url = `url("/assets/icons/${name}.svg")`;
  return (
    <span
      className="micon"
      aria-hidden="true"
      style={{ width: size, height: size, WebkitMaskImage: url, maskImage: url }}
    />
  );
}
