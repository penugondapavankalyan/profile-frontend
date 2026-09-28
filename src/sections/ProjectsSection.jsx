import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';

function Markdown({ content }) {
  if (!content) return null;
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: marked.parse(content) }}
    />
  );
}

function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={alt}>
      <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Close">✕</button>
        <img className="lightbox-img" src={src} alt={alt} />
      </div>
    </div>,
    document.body
  );
}

function LightboxImage({ className, src, alt, onError, style }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        className={`${className || ''} lightbox-trigger`}
        src={src}
        alt={alt}
        style={style}
        onError={onError}
        onClick={e => { e.stopPropagation(); setOpen(true); }}
      />
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ProjectsSection() {
  const [data, setData] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [featuredImgErrors, setFeaturedImgErrors] = useState({});

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/projects.json`)
      .then(res => res.json())
      .then(json => setData(json))
      .catch(() => setData({ featured: [], projects: [] }));
  }, []);

  // Close popup on Escape key
  useEffect(() => {
    if (!activeProject) return;
    const onKey = e => { if (e.key === 'Escape') setActiveProject(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeProject]);

  if (!data) return null;

  const { featured, projects } = data;

  return (
    <>
    <section id="projects" className="section morph-section">
      <div className="container">
        <SectionHeading
          index="03 / Selected projects"
          title="Things built with passion."
          intro="Featured work and supporting projects with clear outcomes."
        />

        {featured?.map(f => (
          <article key={f.title} className="featured" onClick={() => setActiveProject(f)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setActiveProject(f)}>
            <div className="project-info">
              <div>
                <p className="eyebrow">Featured project</p>
                <h3>{f.title}</h3>
                <p className="muted">{f.shortDescription}</p>
                <div className="tags">
                  {f.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}
                </div>
              </div>
              <div className="project-urls" onClick={e => e.stopPropagation()}>
                {f.urls.map(url => (
                  <a key={url.label} className="button" href={url.href} target="_blank" rel="noreferrer">{url.label}</a>
                ))}
              </div>
            </div>
            {f.image && !featuredImgErrors[f.title]
              ? <div className="project-art project-art-image"><img src={`/images/${f.title}/${f.image}`} alt={f.title} onError={() => setFeaturedImgErrors(prev => ({ ...prev, [f.title]: true }))} /></div>
              : <div className="project-art" aria-hidden="true"><div className="shape" /></div>
            }
          </article>
        ))}

        <div className="project-list">
          {projects.map((project) => (
            <article
              className="panel project-card"
              key={project.title}
              onClick={() => setActiveProject(project)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setActiveProject(project)}
            >
              <div className="project-card-title-row">
                {project.image && (
                  <LightboxImage
                    className="project-popup-thumb"
                    src={`/images/${project.title}/${project.image}`}
                    alt={project.title}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <h3>{project.title}</h3>
              </div>
              <p className="muted">{project.shortDescription}</p>
              <div className="tags">
                {project.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}
              </div>
            </article>
          ))}
        </div>
      </div>

    </section>
    {activeProject && createPortal(
      <ProjectPopup project={activeProject} onClose={() => setActiveProject(null)} />,
      document.body
    )}
    </>
  );
}

function CarouselInner({ images, projectTitle, current, setCurrent, isAuto, setIsAuto, timerRef, failedImages, setFailedImages, large }) {
  const originalIndices = images
    .map((_, i) => i)
    .filter(i => !failedImages[i]);

  const count = originalIndices.length;

  if (count === 0) return null;

  const go = dir => {
    setIsAuto(false);
    clearInterval(timerRef.current);
    setCurrent(c => (c + dir + count) % count);
  };

  return (
    <div className={`carousel${large ? ' carousel-large' : ''}`}>
      <button className="carousel-arrow carousel-prev" onClick={() => go(-1)} aria-label="Previous image">&#8250;</button>
      <div className="carousel-track">
        <div className="carousel-strip" style={{ transform: `translateX(-${current * 100}%)` }}>
          {originalIndices.map((origIdx, i) => (
            <LightboxImage
              key={origIdx}
              className="carousel-img"
              src={`/images/${projectTitle}/${images[origIdx]}`}
              alt={`Screenshot ${i + 1}`}
              onError={() => {
                setFailedImages(prev => ({ ...prev, [origIdx]: true }));
                setCurrent(c => Math.max(0, c - 1));
              }}
            />
          ))}
        </div>
        {count > 1 && (
          <div className="carousel-dots">
            {originalIndices.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot${i === current ? ' active' : ''}`}
                onClick={() => { setIsAuto(false); clearInterval(timerRef.current); setCurrent(i); }}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      <button className="carousel-arrow carousel-next" onClick={() => go(1)} aria-label="Next image">&#8250;</button>
    </div>
  );
}

function ImageCarousel({ images, transitionTime, projectTitle }) {
  const [current, setCurrent] = useState(0);
  const [isAuto, setIsAuto] = useState(true);
  const [failedImages, setFailedImages] = useState({});
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef(null);

  const originalIndices = images.map((_, i) => i).filter(i => !failedImages[i]);
  const count = originalIndices.length;

  useEffect(() => { setCurrent(0); setIsAuto(true); }, [images]);

  useEffect(() => {
    if (!isAuto || count <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % count);
    }, transitionTime || 2000);
    return () => clearInterval(timerRef.current);
  }, [isAuto, count, transitionTime]);

  // Close expanded view on Escape
  useEffect(() => {
    if (!expanded) return;
    const onKey = e => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  if (count === 0) return null;

  const sharedProps = { images, projectTitle, current, setCurrent, isAuto, setIsAuto, timerRef, failedImages, setFailedImages };

  return (
    <>
      <div className="carousel-wrapper">
        <CarouselInner {...sharedProps} />
        <button className="carousel-expand-btn" onClick={() => setExpanded(true)} aria-label="View images fullscreen" title="Expand images">⤢</button>
      </div>

      {expanded && createPortal(
        <div className="carousel-fullscreen-overlay" onClick={() => setExpanded(false)}>
          <div className="carousel-fullscreen-inner" onClick={e => e.stopPropagation()}>
            <button className="carousel-fullscreen-close" onClick={() => setExpanded(false)} aria-label="Close">✕</button>
            <CarouselInner {...sharedProps} large />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function ProjectPopup({ project, onClose }) {
  const images = project.project_images || [];
  const transitionTime = project.image_transition_time || 2000;

  return (
    <div className="project-popup-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={project.title}>
      <div className="project-popup panel" onClick={e => e.stopPropagation()}>
        <div className="project-popup-scroll">
        <button className="project-popup-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="project-popup-body">
          <p className="eyebrow">Project</p>
          <div className="project-popup-title-row">
            {project.image && (
              <LightboxImage
                className="project-popup-thumb"
                src={`/images/${project.title}/${project.image}`}
                alt={project.title}
                onError={e => { e.currentTarget.style.display='none'; }}
              />
            )}
            <h3>{project.title}</h3>
          </div>
          <Markdown content={project.detailedDescription} />

          <div className="tags" style={{ marginTop: '12px' }}>
            {project.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}
          </div>

          {project.urls?.length > 0 && (
            <div className="project-popup-urls">
              {project.urls.map(url => (
                <a key={url.label} className="button" href={url.href} target="_blank" rel="noreferrer">{url.label}</a>
              ))}
            </div>
          )}

          {images.length > 0 && (
            <ImageCarousel images={images} transitionTime={transitionTime} projectTitle={project.title} />
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ index, title, intro }) {
  return (
    <div className="section-heading">
      <div><p className="eyebrow">{index}</p><h2>{title}</h2></div>
      <p className="intro muted">{intro}</p>
    </div>
  );
}
