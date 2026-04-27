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
  '.config',
  '.env',
  '.gz',
  '.zip',
  '.tar',
  '.tgz',
  '.7z',
  '.rar',
  '.swp',
  '.save',
  '.dist',
  '.sample',
  '.example',
  '.htpasswd',
  '.npmrc'
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
  '/install',
  '/debug',
  '/debugbar',
  '/aws-credentials',
  '/.s3cfg',
  '/phpinfo',
  '/info.php',
  '/cgi-bin',
  '/xmlrpc',
  '/server-status',
  '/server-info',
  '/actuator',
  '/console',
  '/jolokia',
  '/laravel',
  '/symfony',
  '/drupal',
  '/joomla',
  '/magento',
  '/shopify',
  '/api/v1/.env',
  '/backend',
  '/vendor'
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
