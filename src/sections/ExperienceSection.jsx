import { useEffect, useState } from 'react';

// yearHeight drives both the CSS year-row height AND the JS slot heights —
// they must always match. Mobile (<= 760px) uses 180px to match the CSS rule.
function getYearHeight() {
  return window.innerWidth <= 760 ? 180 : 300;
}

function useYearHeight() {
  const [yearHeight, setYearHeight] = useState(getYearHeight);
  useEffect(() => {
    const onResize = () => setYearHeight(getYearHeight());
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return yearHeight;
}

function getCardPositions(items, firstYear, yearHeight) {
  let previousEnd = 0;
  return items.map(experience => {
    const startOffset = (experience.startYear - firstYear) * yearHeight;
    const marginTop = startOffset - previousEnd;
    const height = (experience.endYear - experience.startYear + 1) * yearHeight;
    previousEnd = Math.max(previousEnd, startOffset + height);
    return { marginTop, height };
  });
}

function ExperienceCard({ experience }) {
  return <article className="panel experience-card">
    <p className="eyebrow">{experience.startYear} — {experience.endYear}</p>
    <h3>{experience.role}</h3>
    <p className="experience-companies">{experience.company.map(company => <span className="experience-company" key={company}>{company}</span>)} <span> {experience.duration}</span></p>
    <p className="muted">{experience.description}</p>
    <div className="tags">{experience.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
  </article>;
}

function ExperienceColumn({ items, firstYear, className, label, yearHeight }) {
  const positions = getCardPositions(items, firstYear, yearHeight);
  return <div className={`experience-cards ${className}`} aria-label={label}>{items.map((experience, index) => <div className="experience-card-slot" key={`${experience.role}-${index}`} style={{ marginTop: `${positions[index].marginTop}px`, minHeight: `${positions[index].height}px` }}><ExperienceCard experience={experience} /></div>)}</div>;
}

export function ExperienceSection() {
  const [experiences, setExperiences] = useState(null);
  const [skills, setSkills] = useState([]);
  const yearHeight = useYearHeight();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/experiences.json`)
      .then(res => res.json())
      .then(data => setExperiences(data))
      .catch(() => setExperiences([]));
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/skills.json`)
      .then(res => res.json())
      .then(data => setSkills(data))
      .catch(() => setSkills([]));
  }, []);

  if (!experiences) return null;

  const firstYear = Math.min(...experiences.map(e => e.startYear));
  const lastYear  = Math.max(...experiences.map(e => e.endYear));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
  const education = experiences.filter(experience => experience.isEducation);
  const professional = experiences.filter(experience => !experience.isEducation);

  return <section id="experience" className="section morph-section">
    <div className="container">
      <SectionHeading index="05 / Experience" title="Work that compounds over time." intro="Scroll chronologically. Education appears on the left and professional experience on the right." />
      <div className="experience-timeline" aria-label="Career experience timeline">
        <div className="experience-rail" aria-hidden="true" />
        <ExperienceColumn items={education} firstYear={firstYear} className="experience-education" label="Education" yearHeight={yearHeight} />
        <div className="experience-years" aria-label="Career years">{years.map(year => <div className="experience-year" key={year}><span className="year-pill">{year}</span></div>)}</div>
        <ExperienceColumn items={professional} firstYear={firstYear} className="experience-professional" label="Professional experience" yearHeight={yearHeight} />
      </div>
      <div className="skills">
        <p className="eyebrow">Skills and technologies</p>
        <ul className="skill-grid">{skills.map(skill => <li className="skill-card" key={skill}>{skill}</li>)}</ul>
      </div>
    </div>
  </section>;
}

function SectionHeading({ index, title, intro }) {
  return <div className="section-heading"><div><p className="eyebrow">{index}</p><h2>{title}</h2></div><p className="intro muted">{intro}</p></div>;
}
