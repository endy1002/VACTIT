export const siteConfig = {
  name: 'VACTIT',
  description: 'Web Application built with Next.js',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  links: {
    github: 'https://github.com/endy1002/VACTIT',
  },
};

export type SiteConfig = typeof siteConfig;
