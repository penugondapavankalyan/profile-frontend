# Frontend Plan

## Overview

Build a React static frontend that preserves the visual language of [`sample-outlook-themes.html`](../sample-outlook-themes.html) while extending it to six sections:

1. Profile
2. Profile information
3. Projects
4. Chat
5. Experience
6. Contact

The frontend is responsible for presentation, navigation, theme state, scroll transitions, chat interaction state, and calling the separate backend API. It does not own chatbot credentials, knowledge-base access, model access, or backend business logic.

All environment-specific configuration must be supplied through environment files and loaded through the frontend configuration layer. Do not hardcode URLs, deployment settings, feature flags, or credentials in components or service modules. Only variables explicitly intended for browser use may be exposed in the built frontend. Secrets must never be placed in the frontend `.env` file because frontend build variables are publicly inspectable.

## Environment configuration

Use a separate local environment file for the frontend. Backend environment variables must live in a separate backend environment file and must never be shared with or loaded by the frontend:

```text
frontend/
├── .env
└── .env.example

backend/
├── .env
└── .env.example
```

The committed [`.env.example`](../frontend/.env.example) documents required frontend variable names without values. The local frontend [`.env`](../../frontend/.env) contains development-only values and must be excluded from version control. The frontend configuration module should read the build tool's public-variable namespace and expose a typed, validated configuration object to the rest of the application.

Public frontend variables (all defined and read through [`src/config/env.js`](../../frontend/src/config/env.js)):

```text
VITE_CHAT_API_BASE_URL=https://api.example.invalid
VITE_CHAT_API_PATH=/chat
VITE_APP_ENV=development
VITE_ENABLE_CHAT=true
VITE_PROFILE_NAME=Your Name
VITE_PROFILE_EMAIL=you@example.com
VITE_LINKEDIN_URL=https://linkedin.com/in/yourprofile
VITE_GITHUB_URL=https://github.com/yourusername
VITE_CONTACT_LINK=https://example.com/contact
VITE_FEATURED_PROJECT_URL=https://example.com/project
VITE_FEATURED_PROJECT_DEMO_URL=https://example.com/demo
```

These variables are configuration, not secrets. API keys, provider credentials, AWS credentials, Google Drive credentials, and signing secrets must remain in the backend secret manager and must never be placed in the frontend environment files.

Load environment values once through [`src/config/env.js`](../../frontend/src/config/env.js). Components and API services import the resolved `env` object rather than reading `import.meta.env` directly throughout the codebase. Validate required values at startup and fail with a developer-facing configuration error without exposing secrets.

During deployment, inject frontend configuration through the selected AWS hosting/build environment rather than committing production values. Backend deployment configuration is managed independently through the backend hosting environment or an approved secret manager. Add `.env`, `.env.*` with the exception of `.env.example`, and generated build output to `.gitignore`. Keep `.bobignore` aligned with the sensitive-file policy.

## Intended frontend stack

- React for component rendering.
- Vite as the build tool.
- Plain CSS organized into tokens, global rules, theme rules, and motion rules.
- Browser APIs such as `IntersectionObserver`, `AbortController`, `crypto.randomUUID`, and `matchMedia` where appropriate.
- `marked` for rendering Markdown content in project descriptions.
- No heavy animation or 3D dependency.

The implementation uses the latest project-approved stable versions when dependencies are selected.

## Actual frontend structure

The implemented file tree differs from the original plan in several places documented below:

```text
frontend/
├── .env                         (local only — gitignored)
├── .env.example                 (TODO: not yet created — see open items)
├── public/
│   ├── data/
│   │   ├── projects.json        (project data loaded at runtime)
│   │   ├── experiences.json     (experience data loaded at runtime)
│   │   ├── skills.json          (skills list loaded at runtime)
│   │   └── ask_me_suggestions.json  (chat suggestion buttons)
│   └── images/
│       ├── Savyasaachi/
│       ├── Verisift/
│       └── Job-Ezy/
├── src/
│   ├── app/
│   │   └── App.jsx              (root component; SiteHeader and ThemeIcon inlined here)
│   ├── components/
│   │   ├── ChatWidget.jsx       (floating chat scroll-to button)
│   │   ├── LoadingIndicator.jsx (animated three-dot loading indicator)
│   │   └── SectionHeading.jsx   (shared heading component — currently unused; headings are
│   │                             duplicated locally in each section file)
│   ├── sections/
│   │   ├── ProfileSections.jsx  (contains both ProfileSection and ProfileInformationSection)
│   │   ├── ProjectsSection.jsx  (contains ProjectsSection, ProjectPopup, ImageCarousel,
│   │   │                         CarouselInner, LightboxImage, Lightbox, Markdown, SectionHeading)
│   │   ├── ChatSection.jsx      (contains ChatSection with inline chat panel logic)
│   │   ├── ExperienceSection.jsx (contains ExperienceSection, ExperienceCard, ExperienceColumn,
│   │   │                          useYearHeight, getCardPositions, SectionHeading)
│   │   └── ContactSection.jsx
│   ├── hooks/
│   │   ├── useActiveSection.js  (IntersectionObserver-based active section tracker)
│   │   ├── useTheme.js          (dark/light theme with localStorage persistence)
│   │   └── useScrollTransition.js (scroll-linked --card-enter / --card-exit CSS vars)
│   ├── config/
│   │   └── env.js               (single env resolution module)
│   ├── services/
│   │   └── chatbotApi.js        (chat API adapter with dev mock fallback)
│   ├── styles/
│   │   ├── tokens.css           (CSS custom properties for both themes)
│   │   ├── global.css           (layout, components, and all section styles)
│   │   ├── theme.css            (light-theme overrides)
│   │   └── motion.css           (@keyframes and .morph-section scroll transition rules)
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

### Structural differences from the original plan

| Plan | Actual |
|---|---|
| `SiteHeader.jsx`, `ThemeToggle.jsx`, `SectionNavigation.jsx` as separate components | Inlined as `SiteHeader` and `ThemeIcon` functions inside `App.jsx` |
| `ProfileSection.jsx` and `ProfileInformationSection.jsx` as separate files | Both exported from `ProfileSections.jsx` |
| `ChatPanel.jsx` as a separate component | Panel logic merged directly into `ChatSection.jsx` |
| `routes.js` | Not created — single-page app has no client-side routing |
| `public/favicon.svg` | Not yet present |
| `.env.example` in frontend root | Not yet created |
| `SectionHeading` as shared component imported by sections | `SectionHeading` duplicated locally in `ProfileSections.jsx`, `ProjectsSection.jsx`, and `ExperienceSection.jsx`; the standalone `components/SectionHeading.jsx` exists but is not imported anywhere |
| Static suggested questions | Loaded dynamically from `/data/ask_me_suggestions.json` |
| Single set of `useTheme`, `useActiveSection`, `useScrollTransition` hooks | Implemented as described; `useYearHeight` is an additional inline hook inside `ExperienceSection.jsx` |

## Visual theme

### Theme name

Cinematic digital profile.

### Visual principles

- Dark near-black default surface.
- White primary text and high-contrast muted text.
- Violet-to-light-blue hero gradient.
- Dark blue interactive controls.
- Subtle panel borders and translucent elevated surfaces.
- Rounded fixed navbar with a collapse/expand toggle.
- Large editorial headings.
- Abstract orb visual using CSS gradients and lightweight effects.
- Floating chat icon that expands to show its label on hover or keyboard focus.
- Light theme with explicit dark-blue controls and readable text.

### Design tokens

CSS variables defined in [`src/styles/tokens.css`](../../frontend/src/styles/tokens.css):

```css
:root {
  --bg: #08090d;
  --panel: #12151f;
  --text: #f5f7fa;
  --muted: #c3cad6;
  --line: rgba(255, 255, 255, 0.22);
  --violet: #b39cff;
  --blue: #174ea6;
  --cyan: #8ecbff;
  --nav: #08090dcc;
  --chat: #05060a77;
  --message: #1e2233;
  --user-message: #6b55bb99;
}

html[data-theme='light'] {
  --bg: #f3f6fb;
  --panel: #ffffff;
  --text: #111827;
  --muted: #42526b;
  --line: rgba(23, 43, 77, 0.27);
  --violet: #5b35c5;
  --blue: #174ea6;
  --cyan: #174ea6;
  --nav: #ffffffed;
  --chat: #eef2f9;
  --message: #eaf0f8;
  --user-message: #dde7f5;
}
```

Theme tokens include `--nav`, `--chat`, `--message`, and `--user-message` which were added during implementation beyond the original plan. The `html[data-theme='light']` selector matches what `useTheme` writes to `document.documentElement.dataset.theme`.

## Section requirements

### 1. Profile section

Implemented in [`src/sections/ProfileSections.jsx`](../../frontend/src/sections/ProfileSections.jsx) as `ProfileSection`.

- Availability eyebrow: commented out but present in source.
- Large profile statement with `<span>` accent on a keyword.
- Short supporting description.
- Explore Projects primary action (`href="#projects"`).
- Ask About Me action (`href="#chat"`).
- Abstract orb visual via `<div class="orb">`.
- Responsive layout via CSS.

### 2. Profile information section

Implemented in [`src/sections/ProfileSections.jsx`](../../frontend/src/sections/ProfileSections.jsx) as `ProfileInformationSection`.

- Biography and current-focus content in two `<article class="panel">` elements.
- Location string and current-exploration copy.
- Three capability cards (Development, Design, Strategy) rendered from a static `capabilities` array.
- Uses a local `SectionHeading` component (duplicated from `components/SectionHeading.jsx`).

### 3. Projects section

Implemented in [`src/sections/ProjectsSection.jsx`](../../frontend/src/sections/ProjectsSection.jsx).

**Data source:** fetches `/data/projects.json` at runtime. The JSON has a `featured` array and a `projects` array. Each project object supports: `title`, `shortDescription`, `detailedDescription` (Markdown string), `image`, `tags`, `urls`, `project_images`, `image_transition_time`.

**Feature extensions beyond the original plan:**

- `ProjectPopup` — full-screen overlay panel with detailed Markdown description, tag list, external links, and image carousel.
- `ImageCarousel` / `CarouselInner` — auto-advancing image carousel inside the popup with manual arrow navigation, dot indicators, and a fullscreen expand mode.
- `LightboxImage` / `Lightbox` — click-to-zoom overlay for individual project images.
- `Markdown` — renders `detailedDescription` as HTML via `marked`.
- Featured article image fallback: if the featured project's image fails to load, a CSS art placeholder renders instead.
- Escape key closes the popup and lightbox.
- Keyboard-accessible project cards (`role="button"`, `tabIndex={0}`, `onKeyDown`).

**Current projects in `projects.json`:**

| Type | Title |
|---|---|
| Featured | Savyasaachi |
| Featured | Verisift |
| Supporting | Job-Ezy |

### 4. Chat section

Implemented in [`src/sections/ChatSection.jsx`](../../frontend/src/sections/ChatSection.jsx).

**Implemented states:**
- Empty state with explanation text.
- Suggested question buttons loaded from `/data/ask_me_suggestions.json`; each suggestion is removed from the list after it is used.
- User message bubbles and assistant response bubbles.
- Animated three-dot loading indicator via [`LoadingIndicator`](../../frontend/src/components/LoadingIndicator.jsx).
- Error state with warning icon and user-facing message.
- Escalating error messages: first two failures show a retry prompt; three or more consecutive failures show a persistent message without a retry button.
- Disabled input and send button while loading.
- Enlarge/restore toggle for the chat box.
- Auto-scroll to latest message on every state change.
- Focus returns to the input after each response (but not on initial page load).

**Chat API adapter** is in [`src/services/chatbotApi.js`](../../frontend/src/services/chatbotApi.js):

- In `development` environment with no API URL configured, returns a local mock response.
- Applies a 15-second timeout via a secondary `AbortController`.
- Combines caller and timeout signals with `AbortSignal.any`.
- Validates that the response body contains a `string` field named `answer`.
- Re-throws non-abort errors in non-development environments.

**Request payload sent to backend:**

```json
{
  "message": "What kind of work do you do?",
  "conversationId": "client-held UUID per page session",
  "requestId": "per-request UUID"
}
```

**Expected response from backend:**

```json
{
  "answer": "Response text"
}
```

**Chat widget** ([`src/components/ChatWidget.jsx`](../../frontend/src/components/ChatWidget.jsx)):

- Visible when the chat section is not intersecting the viewport (hides while chat is in view).
- Uses `IntersectionObserver` with a 0.2 threshold.
- Alarm-shake CSS animation, disabled by `prefers-reduced-motion`.
- Expands to show label on hover or keyboard focus; collapses to icon-only at rest.
- Scrolls to `#chat` on click.

### 5. Experience section

Implemented in [`src/sections/ExperienceSection.jsx`](../../frontend/src/sections/ExperienceSection.jsx).

**Data source:** fetches `/data/experiences.json` at runtime. Each item: `startYear`, `endYear`, `isEducation`, `role`, `company` (array of strings), `duration`, `description`, `tags`.

**Data source:** also fetches `/data/skills.json` — a flat array of skill strings rendered as a skill grid below the timeline.

**Timeline layout:**
- Three-column CSS grid: `education | years | professional`.
- Education cards appear left-aligned with `text-align: right` and `justify-content: flex-end` on tags.
- Professional cards appear right-aligned.
- Year rail rendered as a column of `<div class="experience-year">` elements, one per year in the derived range.
- Card slots are positioned with JS-calculated `marginTop` and `minHeight` based on `startYear`, `endYear`, and `yearHeight`.
- Cards use `position: sticky; top: 130px` so they pin to the viewport while the year rail scrolls past.
- `yearHeight` is 300px on desktop and 180px on mobile, derived by `useYearHeight` (inline hook, not a separate file).

**Responsive:**
- On screens ≤ 760 px the timeline grid narrows (`minmax(0,1fr) 64px minmax(0,1fr)`), year pills shrink, and card content uses reduced font sizes.

**Skills area** follows the timeline as a `<ul class="skill-grid">` from the `skills.json` array.

**Current data in `experiences.json`:**

| Years | Type | Role | Organisation |
|---|---|---|---|
| 2018–2022 | Education | Electrical & Electronics Engg | SASTRA UNIVERSITY |
| 2022–2022 | Professional | Application Developer Intern | IBM |
| 2023–2026 | Professional | Application Developer | IBM |
| 2025–2027 | Education | Masters in Data Science & Management | IIM INDORE / IIT INDORE |

### 6. Contact section

Implemented in [`src/sections/ContactSection.jsx`](../../frontend/src/sections/ContactSection.jsx).

- Reads `linkedinUrl`, `githubUrl`, `profileEmail`, `contactLink`, and `profileName` from `env`.
- LinkedIn and GitHub social buttons rendered when the respective env value is set.
- Primary `mailto:` email link.
- Optional secondary contact link (rendered when `contactLink` env is set).
- All links open in `_blank` with `rel="noreferrer"`.

## Navigation and URL behavior

Single-page anchor navigation with `#profile`, `#profile-information`, `#projects`, `#chat`, `#experience`, `#contact`.

**`SiteHeader`** (inlined in [`App.jsx`](../../frontend/src/app/App.jsx)):

- Fixed, rounded pill — full-width centered pill with `backdrop-filter: blur`.
- Brand mark (circle initial + name) on the left.
- Collapsible nav: clicking the brand circle collapses/expands the nav links with a ripple-into-circle animation (staggered `transition-delay` per link).
- In collapsed state the header pill dissolves to transparent, nav links shrink and fly into the mark circle.
- Active section link highlighted via `useActiveSection`.
- Theme toggle button on the right.

**`useActiveSection`** ([`src/hooks/useActiveSection.js`](../../frontend/src/hooks/useActiveSection.js)):

- Uses `IntersectionObserver` with `rootMargin: '-35% 0px -55% 0px'` so only the section occupying the central viewport band is marked active.

**`useTheme`** ([`src/hooks/useTheme.js`](../../frontend/src/hooks/useTheme.js)):

- Persists preference to `localStorage` under key `profile-theme`.
- Writes the value to `document.documentElement.dataset.theme` to drive `html[data-theme='light']` CSS selectors.

**Floating chat widget:** see Chat section above. Also present: a `back-to-top-btn` fixed button (`href="#profile"`) positioned bottom-right above the chat widget.

## Scroll transition

Implemented in [`src/hooks/useScrollTransition.js`](../../frontend/src/hooks/useScrollTransition.js) and [`src/styles/motion.css`](../../frontend/src/styles/motion.css).

Every `.morph-section` element receives two live CSS custom properties written by a passive scroll listener:

| Variable | Range | Meaning |
|---|---|---|
| `--card-enter` | 1 → 0 | 1 = section far below fold; 0 = section top has reached the nav bar |
| `--card-exit` | 0 → 1 | 0 = section bottom still visible; 1 = section 45 vh above fold |

Combined CSS effect in `motion.css`:

```css
transform:
  translateY(calc(var(--card-enter) * 140px))
  scale(calc(1 - var(--card-enter) * 0.10 - var(--card-exit) * 0.04));

opacity: calc(
  (1 - var(--card-enter) * 0.92) * (1 - var(--card-exit) * 0.85)
);
```

- The first section (hero) never applies an enter transition — it must be fully visible on load.
- The last section at page bottom has its enter value forced to 0 to remain fully visible.
- When `prefers-reduced-motion: reduce` is detected, all transform and opacity overrides are removed and the hook sets both vars to `0`.

## Chat API boundary

**Request (frontend → backend):**

```json
{
  "message": "What kind of work do you do?",
  "conversationId": "optional-client-conversation-id",
  "requestId": "client-generated-request-id"
}
```

**Response (backend → frontend):**

```json
{
  "answer": "Response text",
  "requestId": "server-correlated-request-id",
  "sources": []
}
```

The frontend validates only that `data.answer` is a string. The `requestId` and `sources` fields in the response are accepted but not currently consumed by the UI. The frontend handles timeout (15 s), network failure, non-2xx responses, invalid response shape, and user-initiated abort without exposing internal details.

## Accessibility requirements

- Semantic `header`, `nav`, `main`, `section`, `footer`, headings, `button`, and `a` elements throughout.
- Logical heading hierarchy: `h1` in the hero, `h2` per section, `h3` per card.
- Accessible names on icon-only controls (`aria-label` on theme toggle, chat widget, carousel arrows, expand/close buttons).
- `aria-label` and `aria-expanded` on the nav collapse toggle.
- `aria-hidden="true"` on decorative SVG icons.
- `aria-live="polite"` on the chatbox and `role="status"` on the loading indicator.
- `role="alert"` on error messages.
- `role="dialog" aria-modal="true"` on project popup, lightbox, and carousel fullscreen overlays.
- Escape key closes all overlays and popups.
- `prefers-reduced-motion` disables scroll transitions and chat widget shake animation.
- Visible keyboard focus managed through CSS focus-visible rules.
- `scroll-margin-top` on sections keeps headings clear of the fixed nav.

## Public data files

Content that changes independently of the application code is kept in `public/data/` and fetched at runtime. No rebuild is required to update these files.

| File | Purpose |
|---|---|
| [`public/data/projects.json`](../../frontend/public/data/projects.json) | Featured and supporting project cards, Markdown descriptions, image lists, external links |
| [`public/data/experiences.json`](../../frontend/public/data/experiences.json) | Career and education timeline entries |
| [`public/data/skills.json`](../../frontend/public/data/skills.json) | Flat array of skill / technology strings |
| [`public/data/ask_me_suggestions.json`](../../frontend/public/data/ask_me_suggestions.json) | Chat suggestion button labels |

Project images are served from `public/images/<ProjectTitle>/`. The `image` field in a project object is a filename relative to that folder.

## Frontend implementation tasks

### Sub-task 1 — React foundation

**Intent:** Establish a maintainable React static application.

**Expected outcomes:** The frontend builds locally and renders the section shell.

**Todo list:**

- [x] Create the React/Vite frontend structure.
- [x] Add the approved package manifest and lock file.
- [x] Add the application entry point and root component.
- [x] Add lint, formatting, and build scripts.
- [ ] Add `.env.example` to document required variable names.

**Status:** `[x] complete` (`.env.example` outstanding — see open items)

---

### Sub-task 2 — Theme and layout system

**Intent:** Preserve the reference theme while making it reusable in React.

**Expected outcomes:** Dark and light themes render consistently across all sections.

**Todo list:**

- [x] Extract colors and spacing into CSS tokens (`tokens.css`).
- [x] Implement theme switching and persistence (`useTheme`).
- [x] Implement the fixed navbar and active section navigation (`useActiveSection`).
- [x] Implement responsive layout rules.
- [ ] Validate contrast for both themes with an automated checker.

**Status:** `[x] complete` (contrast audit outstanding)

---

### Sub-task 3 — Profile and information sections

**Intent:** Build the first two content sections and preserve the hero identity.

**Expected outcomes:** Hero actions, orb, profile information, and capability cards are visible and accessible.

**Todo list:**

- [x] Build `ProfileSection`.
- [x] Build `ProfileInformationSection`.
- [x] Add responsive orb treatment.
- [x] Add keyboard and focus behavior.
- [x] Add section IDs and navigation targets.

**Status:** `[x] complete`

---

### Sub-task 4 — Projects, experience, and contact sections

**Intent:** Complete the non-chat profile content.

**Expected outcomes:** Projects, experience, and contact content are scannable and responsive.

**Todo list:**

- [x] Build `ProjectsSection` with featured and supporting project cards.
- [x] Add `ProjectPopup` with Markdown description, image carousel, and external links.
- [x] Add `ImageCarousel` with auto-advance, manual navigation, dots, and fullscreen expand.
- [x] Add `LightboxImage` / `Lightbox` for click-to-zoom on project images.
- [x] Build `ExperienceSection` with scroll-linked three-column timeline.
- [x] Build `ContactSection` reading all contact details from `env`.
- [x] Add accessible links and focus states.
- [x] Test narrow and wide layouts.

**Status:** `[x] complete`

---

### Sub-task 5 — Chat interaction shell

**Intent:** Make the chatbot experience usable before backend implementation is complete.

**Expected outcomes:** Users can select suggestions, submit messages, see loading feedback, receive a mocked response during development, and see errors accessibly.

**Todo list:**

- [x] Build the floating `ChatWidget` with hide-when-visible behavior.
- [x] Build the chat panel and controlled input inside `ChatSection`.
- [x] Load suggested-question buttons from `/data/ask_me_suggestions.json`; remove each after use.
- [x] Add the accessible three-dot `LoadingIndicator`.
- [x] Add request cancellation and 15 s timeout handling in `chatbotApi.js`.
- [x] Add escalating error messages and retry logic (retry shown for first 2 failures; persistent message shown on 3+).
- [x] Add development mock mode (`VITE_APP_ENV=development` + no API URL).

**Status:** `[x] complete`

---

### Sub-task 6 — Scroll motion and accessibility validation

**Intent:** Preserve the visual transition without hiding content or reducing usability.

**Expected outcomes:** Desktop and mobile transitions are visible, bounded, readable, and disabled or simplified for reduced-motion users.

**Todo list:**

- [x] Isolate transition calculations in `useScrollTransition`.
- [x] Keep hero section always fully visible on load (enter var forced to 0 for the first section).
- [x] Keep last section always fully visible at page bottom (enter var forced to 0 when `atBottom`).
- [x] Add reduced-motion behavior (both vars forced to 0 when `prefers-reduced-motion: reduce`).
- [x] Implement CSS keyframe animation for nav collapse (ripple-into-circle effect).
- [ ] Test keyboard navigation during and after transitions.
- [ ] Run contrast, accessibility, lint, and build validation end-to-end.

**Status:** `[-] in progress` (validation steps outstanding)

---

## Open items

The following items were planned but have not yet been implemented:

| Item | Priority | Notes |
|---|---|---|
| `frontend/.env.example` | High | Documents required variable names for new developers and deployment. Needed before any new environment setup. |
| `public/favicon.svg` | Medium | Currently no favicon is served. The `index.html` does not reference one. |
| Contrast audit (both themes) | Medium | Foreground/background combinations should be tested against WCAG 2.2 AA (4.5:1 body, 3:1 large text) before release. |
| Deduplicate `SectionHeading` | Low | The component is defined three times locally. The shared `components/SectionHeading.jsx` exists but is not imported anywhere. Consolidate or remove the standalone file. |
| End-to-end accessibility + lint validation | Medium | Run contrast checker, keyboard navigation test, lint, and production build validation as described in Sub-task 6. |
| `routes.js` | Resolved | Not needed — single-page anchor navigation requires no client-side router. |
| Separate `SiteHeader.jsx` / `ThemeToggle.jsx` / `SectionNavigation.jsx` | Resolved | Inlined in `App.jsx`; acceptable for current complexity level. |
| Separate `ChatPanel.jsx` | Resolved | Panel logic merged into `ChatSection.jsx`; acceptable for current scope. |
