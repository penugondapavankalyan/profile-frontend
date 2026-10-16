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
VITE_ENABLE_CHAT=true
VITE_CHAT_API_BASE_URL=https://api.example.invalid
VITE_CHAT_API_PATH=/chat
# Optional — unset (= false) for the local runner and production.
# VITE_LAMBDA_INVOKE=true
VITE_PROFILE_NAME=Your Name
VITE_PROFILE_EMAIL=you@example.com
VITE_CONTACT_LINK=
VITE_LINKEDIN_URL=
VITE_GITHUB_URL=
```

| Variable | Read by | Purpose |
|---|---|---|
| `VITE_ENABLE_CHAT` | `env.chatEnabled` | `true` always calls the backend; anything else makes no request and shows a "backend not connected" notice. |
| `VITE_CHAT_API_BASE_URL` | `env.apiBaseUrl` | Backend base URL, or `/lambda` to go through the dev proxy. |
| `VITE_CHAT_API_PATH` | `env.apiPath` | `/chat` for the local runner / HTTP API; `/2015-03-31/functions/function/invocations` for the Lambda container (RIE). |
| `VITE_LAMBDA_INVOKE` | `env.lambdaInvoke` | Optional. `=== 'true'` enables the Lambda envelope (see below). Unset or any other value is `false`. Production needs no value. |
| `VITE_PROFILE_NAME` | `env.profileName`, `index.html` | Header brand, page title, footer, contact button label. |
| `VITE_PROFILE_EMAIL` | `env.profileEmail` | `mailto:` link in the contact section. |
| `VITE_CONTACT_LINK` / `VITE_LINKEDIN_URL` / `VITE_GITHUB_URL` | `env.contactLink` / `linkedinUrl` / `githubUrl` | Contact buttons; each button is hidden when its value is empty. |

Two further variables are read **outside** the browser bundle, by [`vite.config.js`](../../frontend/vite.config.js):

| Variable | Purpose |
|---|---|
| `CHAT_PROXY_TARGET` | Dev only. Backend URL (e.g. `http://localhost:9002` for the local runner, or the container's mapped port) that the Vite dev server proxies `/lambda` to. It is not a `VITE_` variable, so it is never bundled. |
| `VITE_BASE_PATH` | Build-time `base` for the static bundle; defaults to `/`. |

Removed during implementation: `VITE_APP_ENV` (nothing consumed it), `VITE_FEATURED_PROJECT_URL` and `VITE_FEATURED_PROJECT_DEMO_URL` (project links now come from `public/data/projects.json`), `VITE_SKILLS` (skills come from `public/data/skills.json`), and the earlier name `VITE_CHAT_LAMBDA_INVOKE` (now `VITE_LAMBDA_INVOKE`).

### Request/response wrapping (`VITE_LAMBDA_INVOKE`)

The frontend supports two backend modes selected by `VITE_LAMBDA_INVOKE`:

| | `false` / unset (default) | `true` |
|---|---|---|
| Use for | Local FastAPI runner (`/chat`), production HTTP API | Local Lambda container (RIE) |
| `VITE_CHAT_API_PATH` | `/chat` | `/2015-03-31/functions/function/invocations` |
| Request body | Plain JSON payload | Wrapped: `{ "body": "<stringified JSON payload>" }` |
| JSON response | Read directly (`data.answer`) | Unwrapped from `{ statusCode, body }`: must be `statusCode === 200`, then `body` is `JSON.parse`d |

Both the wrap and the unwrap are in [`src/services/chatbotApi.js`](../../frontend/src/services/chatbotApi.js), driven only by `env.lambdaInvoke`. Sending the wrapped body to `/chat` causes `400 VALIDATION_ERROR: message is required`, and sending a plain body to the RIE endpoint fails, so the flag and the path must be changed together.

**Streaming limitation:** the RIE `/invocations` endpoint returns one JSON document, not an SSE stream, and the SSE-reading branch does not unwrap. With `VITE_LAMBDA_INVOKE=true`, turn "Live typing" OFF so the request is sent with `stream: false`; with it ON the call succeeds but no answer is shown.

In local development `VITE_CHAT_API_BASE_URL=/lambda` goes through the Vite proxy (`CHAT_PROXY_TARGET`), which strips the `/lambda` prefix. In production the invoke URL of the HTTP API has **no stage segment**: `https://{id}.execute-api.{region}.amazonaws.com/chat` (not `.../prod/chat`).

These variables are configuration, not secrets. API keys, provider credentials, AWS credentials, Google Drive credentials, and signing secrets must remain in the backend secret manager and must never be placed in the frontend environment files.

Load environment values once through [`src/config/env.js`](../../frontend/src/config/env.js). Components and API services import the resolved `env` object rather than reading `import.meta.env` directly throughout the codebase (the only exceptions are `import.meta.env.BASE_URL` for fetching `public/` assets). `env.js` currently returns an empty string for any unset value and does **not** validate required values at startup; adding a developer-facing configuration check is an open item.

During deployment, inject frontend configuration through the selected AWS hosting/build environment rather than committing production values. Backend deployment configuration is managed independently through the backend hosting environment or an approved secret manager. Add `.env`, `.env.*` with the exception of `.env.example`, and generated build output to `.gitignore`. Keep `.bobignore` aligned with the sensitive-file policy.

## Intended frontend stack

- React for component rendering.
- Vite as the build tool.
- Plain CSS organized into tokens, global rules, theme rules, and motion rules.
- Browser APIs such as `IntersectionObserver`, `AbortController`, `crypto.randomUUID`, and `matchMedia` where appropriate.
- `marked` for rendering Markdown content in project descriptions and assistant chat replies.
- `dompurify` for sanitizing the HTML generated from assistant (LLM) Markdown before it is injected.
- No heavy animation or 3D dependency.

The implementation uses the latest project-approved stable versions when dependencies are selected.

## Actual frontend structure

The implemented file tree differs from the original plan in several places documented below:

```text
frontend/
├── .env                         (local only — gitignored)
├── .env.example                 (documents required variable names)
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
│   │   ├── MarkdownMessage.jsx  (renders assistant replies: marked → table wrap → DOMPurify)
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
│   │   └── chatbotApi.js        (chat API adapter: JSON + SSE, optional Lambda envelope)
│   ├── styles/
│   │   ├── tokens.css           (CSS custom properties for both themes)
│   │   ├── global.css           (layout, components, and all section styles)
│   │   ├── theme.css            (light-theme overrides)
│   │   └── motion.css           (@keyframes and .morph-section scroll transition rules)
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js               (React plugin, VITE_BASE_PATH, dev-only /lambda proxy)
├── eslint.config.js
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
| `.env.example` in frontend root | Created |
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
- Disabled input and send button while loading or streaming.
- "Live typing" toggle (blue switch with an ⓘ tooltip) above the input. Default ON; component state only (`streamEnabled` in `App.jsx`). Changing it mid-conversation applies to the next message; the conversation is not reset.
- Streaming UX: the three-dot `LoadingIndicator` shows until the first token arrives, then it is replaced by an assistant bubble that grows in place as tokens arrive. With the toggle OFF the dots show until the full JSON answer arrives and the answer renders at once.
- Assistant replies are rendered as Markdown through [`MarkdownMessage`](../../frontend/src/components/MarkdownMessage.jsx): `marked` (GFM, line breaks) → tables wrapped in `<div class="table-wrap">` → `DOMPurify.sanitize`. LLM output is treated as untrusted. User messages are plain text.
- Wide Markdown tables scroll horizontally inside the bubble (`.message .markdown .table-wrap { overflow-x: auto }`, `table { width: max-content; min-width: 100% }`); long words and URLs wrap via `overflow-wrap: anywhere`.
- Chat state survives a page refresh: messages (`chat.messages`) and the `conversation_id` (`chat.conversationId`) are kept in `sessionStorage` and cleared when the tab closes.
- Enlarge/restore toggle for the chat box.
- Auto-scroll to latest message on every state change.
- Focus returns to the input after each response (but not on initial page load).

**Chat API adapter** is in [`src/services/chatbotApi.js`](../../frontend/src/services/chatbotApi.js):

- When `VITE_ENABLE_CHAT=false`, makes no network request and returns `{ disabled: true }`; `App.jsx` then adds a `role: 'notice'` message rendered by `ChatSection` as a styled `.chat-notice` ("backend not connected") instead of a chat bubble.
- When `VITE_ENABLE_CHAT=true`, always calls the backend. There is no mock fallback: connection refused, non-2xx, invalid shape, `[ERROR]` and timeout all surface as the red error with Retry (persistent message after 3 failures).
- Applies a timeout via a secondary `AbortController`: 3 minutes when `stream: true`, 2 minutes when `stream: false`.
- Always sends `stream` explicitly in the request body.
- Wraps the request body in the Lambda envelope only when `env.lambdaInvoke` is `true`, and unwraps `{ statusCode, body }` on the JSON response path only in that case (see Environment configuration).
- Combines caller and timeout signals with `AbortSignal.any`.
- Validates that the response body contains a `string` field named `answer`.
- Re-throws all non-abort errors to the caller.

**Request payload sent to backend** (the payload itself; with `VITE_LAMBDA_INVOKE` unset/false this is the entire request body):

```json
{
  "message": "What kind of work do you do?",
  "request_id": "per-request UUID",
  "conversation_id": "optional, client-held UUID per tab session",
  "stream": true
}
```

**Request body when `VITE_LAMBDA_INVOKE=true`** (Lambda container / RIE): the payload above is stringified and placed in `body`:

```json
{ "body": "{\"message\":\"What kind of work do you do?\",\"request_id\":\"…\",\"stream\":false}" }
```

**Expected response when `stream: false` and `VITE_LAMBDA_INVOKE` is unset/false** (`Content-Type: application/json`, no wrapper, no `statusCode`, no stringified body):

```json
{
  "answer": "Response text",
  "conversation_id": "uuid",
  "request_id": "uuid",
  "sources": []
}
```

**Expected response when `stream: false` and `VITE_LAMBDA_INVOKE=true`** (Lambda container / RIE): a Lambda response whose `body` is a JSON string with the same shape as above:

```json
{ "statusCode": 200, "headers": {}, "body": "{\"answer\":\"…\",\"conversation_id\":\"uuid\",\"request_id\":\"uuid\",\"sources\":[]}" }
```

A `statusCode` other than `200` is treated as `Chat request failed`.

**Expected response when `stream: true`** (`Content-Type: text/event-stream`; not available through the RIE endpoint):

```text
data: <token>

data: <token>

data: [DONE]

```

- Each token arrives as `data: <token>\n\n`; the frontend appends it to the current assistant bubble.
- Tokens may also be JSON-wrapped as `data: {"token": "..."}`; JSON is parsed only when the payload starts with `{`, otherwise it is appended as plain text.
- `data: [DONE]` ends the stream (the read loop exits completely and the reader is cancelled).
- `data: [ERROR]` signals a backend failure; the frontend throws `Chat request failed` and removes the partial bubble.
- `conversation_id` is **not** sent in the stream. The frontend keeps using the one it already holds (or none, on the first message).

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

`POST {VITE_CHAT_API_BASE_URL}{VITE_CHAT_API_PATH}`. The default contract (`/chat`, `VITE_LAMBDA_INVOKE` unset) is the plain-JSON request and the JSON / SSE responses described in the Chat section above. For the Lambda container, set `VITE_CHAT_API_PATH=/2015-03-31/functions/function/invocations` and `VITE_LAMBDA_INVOKE=true` to send the enveloped request and unwrap the `{ statusCode, body }` response (JSON only). The HTTP API invoke URL has no stage segment.

For `stream: false` the frontend validates only that `data.answer` is a string (after unwrapping, when `VITE_LAMBDA_INVOKE=true`). `conversation_id` from the response is stored in `sessionStorage`. `request_id` and `sources` are accepted but not consumed by the UI. The frontend handles timeout (3 min stream / 2 min non-stream), network failure, non-2xx responses, invalid response shape, `[ERROR]` stream events, and user-initiated abort without exposing internal details.

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
- [x] Add `.env.example` to document required variable names.

**Status:** `[x] complete`

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

**Expected outcomes:** Users can select suggestions, submit messages, see loading feedback, receive streamed or full Markdown-formatted answers from the backend, and see errors accessibly.

**Todo list:**

- [x] Build the floating `ChatWidget` with hide-when-visible behavior.
- [x] Build the chat panel and controlled input inside `ChatSection`.
- [x] Load suggested-question buttons from `/data/ask_me_suggestions.json`; remove each after use.
- [x] Add the accessible three-dot `LoadingIndicator`.
- [x] Add request cancellation and timeout handling (3 min stream / 2 min non-stream) in `chatbotApi.js`.
- [x] Add escalating error messages and retry logic (retry shown for first 2 failures; persistent message shown on 3+).
- [x] Add `VITE_ENABLE_CHAT` switch: `false` shows a styled "backend not connected" notice; `true` always calls the backend.
- [x] Add optional `VITE_LAMBDA_INVOKE` (default false) for request wrapping / response unwrapping against the Lambda container.
- [x] Render assistant replies as sanitized Markdown with horizontally scrolling tables.
- [x] Persist chat messages and `conversation_id` in `sessionStorage`.

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
| `frontend/.env.example` | Resolved | Created; documents all variables the code reads, including the optional `VITE_LAMBDA_INVOKE` and dev-only `CHAT_PROXY_TARGET`. |
| Streaming with `VITE_LAMBDA_INVOKE=true` | Medium | The SSE branch does not unwrap and the RIE endpoint cannot stream, so "Live typing" must be OFF in container mode. Consider forcing `stream: false` when `env.lambdaInvoke` is true. |
| Startup config validation | Low | `env.js` does not validate required variables; unset values silently become `''`. |
| Sanitize project Markdown | Low | `ProjectsSection.jsx` renders `marked.parse(detailedDescription)` without DOMPurify. The source is the first-party `projects.json`, but sanitizing would match the chat renderer. |
| `public/favicon.svg` | Medium | Currently no favicon is served. The `index.html` does not reference one. |
| Contrast audit (both themes) | Medium | Foreground/background combinations should be tested against WCAG 2.2 AA (4.5:1 body, 3:1 large text) before release. |
| Deduplicate `SectionHeading` | Low | The component is defined three times locally. The shared `components/SectionHeading.jsx` exists but is not imported anywhere. Consolidate or remove the standalone file. |
| End-to-end accessibility + lint validation | Medium | Run contrast checker, keyboard navigation test, lint, and production build validation as described in Sub-task 6. |
| `routes.js` | Resolved | Not needed — single-page anchor navigation requires no client-side router. |
| Separate `SiteHeader.jsx` / `ThemeToggle.jsx` / `SectionNavigation.jsx` | Resolved | Inlined in `App.jsx`; acceptable for current complexity level. |
| Separate `ChatPanel.jsx` | Resolved | Panel logic merged into `ChatSection.jsx`; acceptable for current scope. |
