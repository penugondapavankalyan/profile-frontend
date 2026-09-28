import { env } from '../config/env.js';

export function ContactSection() {
  return (
    <section id="contact" className="section contact-section morph-section">
      <div className="container contact">
        <div>
          <p className="eyebrow">06 / Contact</p>
          <h2>Let's build something meaningful.</h2>
        </div>
        <div className="actions">
          <div className="contact-social">
            {env.linkedinUrl && (
              <a className="contact-social-btn linkedin" href={env.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn ↗</a>
            )}
            {env.githubUrl && (
              <a className="contact-social-btn github" href={env.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
            )}
          </div>
          <div className="contact-bottom">
            <a className="button primary" href={`mailto:${env.profileEmail}`}>Send an email ↗</a>
            {env.contactLink && (
              <a className="button primary" href={env.contactLink} target="_blank" rel="noreferrer">Contact {env.profileName} ↗</a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
