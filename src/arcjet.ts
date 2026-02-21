import 'dotenv/config';
import arcjet, { detectBot, shield, slidingWindow } from '@arcjet/node';
import type { Request, Response, NextFunction } from 'express';

const arcjetKey = process.env['ARCJET_KEY'];
const arcjetMode = process.env['ARCJET_MODE'] === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

if (!arcjetKey) throw new Error('No arcjetKey provided');

export const httpArcjet = arcjetKey && arcjetKey !== 'ajkey_test_local_development_key'
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] }),
        slidingWindow({ mode: arcjetMode, interval: '10s', max: 50 }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey && arcjetKey !== 'ajkey_test_local_development_key'
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] }),
        slidingWindow({ mode: arcjetMode, interval: '2s', max: 5 }),
      ],
    })
  : null;

export function securityMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!httpArcjet) return next();

    try {
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ error: 'Too many requests' });
        }
        return res.status(403).json({ error: 'Access denied' });
      }
    } catch (error) {
      console.error('Error while authenticating', error);
      return res.status(500).json({ error: 'Service Unavailable' });
    }

    next();
  };
}
