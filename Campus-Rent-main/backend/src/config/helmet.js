import helmet from 'helmet';

const buildCSP = () => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const frontendOrigins = frontendUrl
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const devOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];

  const connectSrc = [
    "'self'",
    ...frontendOrigins,
    ...devOrigins,
    'ws://localhost:5000',
    'wss://localhost:5000',
    'https://res.cloudinary.com',
  ];

  const imgSrc = [
    "'self'",
    'data:',
    'https://res.cloudinary.com',
  ];

  const fontSrc = [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
    'https://cdnjs.cloudflare.com',
  ];

  const styleSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://cdnjs.cloudflare.com',
  ];

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
  ];

  return {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc,
      imgSrc,
      fontSrc,
      styleSrc,
      scriptSrc,
      frameSrc: ["'self'"],
      ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
    },
  };
};

export const helmetConfig = helmet({
  contentSecurityPolicy: buildCSP(),
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  xXssProtection: true,
  xContentTypeOptions: true,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  hidePoweredBy: true,
});
