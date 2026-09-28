const capabilities = [
  ['Development', 'Full-stack applications'],
  ['Design', 'Interfaces and systems'],
  ['Strategy', 'Ideas into outcomes']
];

export function ProfileSection() {
  return <section id="profile" className="hero-section morph-section morph-hero">
    <div className="container hero-content"><div>
      {/* <p className="eyebrow">Available for selected work · 2026</p> */}
      <h1>I build <span>thoughtful</span> digital systems.</h1>
      <p className="lead">Designer, developer, and problem solver creating useful digital experiences where technology meets clarity.</p>
      <div className="actions"><a className="button primary" href="#projects">Explore projects ↗</a><a className="button" href="#chat">Ask about me</a></div>
    </div><div className="orb-area"><div className="orb" aria-hidden="true"/></div></div>
  </section>;
}

export function ProfileInformationSection() {
  return <section id="profile-information" className="section morph-section"><div className="container">
    {/* <SectionHeading index="02 / Profile information" title="Curiosity with a practical edge." intro="A compact introduction with useful context about the person behind the work." /> */}
    <SectionHeading index="02 / Profile information" title="Curiosity with a practical edge."  />
    <div className="two-column"><article className="panel"><p>I combine engineering, design, and curiosity to build meaningful digital products. My work turns complex ideas into experiences that feel simple, fast, and human.</p><p className="muted">Based in London · Working globally</p></article><article className="panel"><p className="eyebrow">Currently exploring</p><p className="feature-copy">Knowledge experiences, intelligent interfaces, and systems that make information easier to use.</p></article></div>
    <div className="capabilities">{capabilities.map(([title, description], index) => <article className="capability" key={title}><span className="eyebrow">0{index + 1}</span><strong>{title}</strong><span className="muted">{description}</span></article>)}</div>
  </div></section>;
}

function SectionHeading({ index, title, intro }) {
  return <div className="section-heading"><div><p className="eyebrow">{index}</p><h2>{title}</h2></div><p className="intro muted">{intro}</p></div>;
}
