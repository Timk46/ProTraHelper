export const environment = {
  server: 'http://localhost:3000',
  websiteUrl: 'http://localhost:4200', // Placeholder for local dev, will be replaced in prod build
  max_html_body_size: 5000000, // Size in bytes
  websocketUrl: 'http://localhost:3100',
  production: false,

  // Performance monitoring feature flag
  // Set to true to enable performance profiling logs
  // Production: false (disabled), Development: true (enabled)
  enableProfiling: !false, // Enabled in development, disabled in production
};
