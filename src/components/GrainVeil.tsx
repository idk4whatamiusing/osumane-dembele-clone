/**
 * The grain that covers the whole site.
 *
 * The reference site tiles a small noise texture over every section at a low
 * opacity, which keeps the flat colours from looking synthetic.
 */
export function GrainVeil() {
  return <div className="grain-veil" aria-hidden="true" data-grain-veil="true" />;
}
