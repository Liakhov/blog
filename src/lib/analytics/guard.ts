import { defineMiddleware } from 'astro:middleware';

const RECON_EXTENSIONS = [
  '.php',
  '.asp',
  '.aspx',
  '.jsp',
  '.cgi',
  '.bak',
  '.old',
  '.sql',
  '.log',
  '.htaccess',
  '.ini',
  '.config'
];

const RECON_PATHS = [
  '/wp-',
  '/wordpress',
  '/admin',
  '/phpmyadmin',
  '/.env',
  '/.git',
  '/.svn',
  '/.aws',
  '/setup',
  '/install'
];

export const guard = defineMiddleware((context, next) => {
  const path = new URL(context.request.url).pathname.toLowerCase();

  if (RECON_EXTENSIONS.some(ext => path.endsWith(ext))) {
    return new Response(null, { status: 404 });
  }
  if (RECON_PATHS.some(p => path.startsWith(p))) {
    return new Response(null, { status: 404 });
  }

  return next();
});
