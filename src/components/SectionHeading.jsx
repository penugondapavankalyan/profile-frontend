export function SectionHeading({ index, title, intro }) {
  return <div className="section-heading"><div><p className="eyebrow">{index}</p><h2>{title}</h2></div><p className="intro muted">{intro}</p></div>;
}
