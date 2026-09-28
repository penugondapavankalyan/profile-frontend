const raw = import.meta.env;

const required = name => raw[name] ?? '';

export const env = Object.freeze({
  apiBaseUrl: required('VITE_CHAT_API_BASE_URL'),
  apiPath: required('VITE_CHAT_API_PATH'),
  appEnvironment: required('VITE_APP_ENV'),
  chatEnabled: required('VITE_ENABLE_CHAT') === 'true',
  profileName: required('VITE_PROFILE_NAME'),
  profileEmail: required('VITE_PROFILE_EMAIL'),
  linkedinUrl: required('VITE_LINKEDIN_URL'),
  githubUrl: required('VITE_GITHUB_URL'),
  contactLink: required('VITE_CONTACT_LINK'),
  featuredProjectUrl: required('VITE_FEATURED_PROJECT_URL'),
  featuredProjectDemoUrl: required('VITE_FEATURED_PROJECT_DEMO_URL'),
});
