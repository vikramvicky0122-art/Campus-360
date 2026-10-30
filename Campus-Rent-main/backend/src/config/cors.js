const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];

const normalizeOrigin = (origin) => String(origin || '').trim().replace(/\/$/, '');

const parseFrontendOrigins = () => {
  const raw = process.env.FRONTEND_URL || '';
  return raw
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
};

const buildAllowedOrigins = () => {
  const fromEnv = parseFrontendOrigins();
  const isProduction = process.env.NODE_ENV === 'production';
  const combined = isProduction ? fromEnv : [...fromEnv, ...DEV_ORIGINS];
  return new Set(combined);
};

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (no Origin header), e.g. health checks.
    if (!origin) {
      return callback(null, true);
    }

    const normalized = normalizeOrigin(origin);
    const allowedOrigins = buildAllowedOrigins();

    if (allowedOrigins.has(normalized)) {
      return callback(null, true);
    }

    return callback(new Error('CORS policy: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};
