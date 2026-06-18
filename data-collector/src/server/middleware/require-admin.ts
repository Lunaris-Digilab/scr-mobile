import type { Request, Response, NextFunction } from 'express';
import { getAnonClient, getServiceClient } from '../supabase.js';
import { logger } from '../../utils/logger.js';

export interface AuthedRequest extends Request {
  user?: { id: string; email: string };
}

/** Extract a bearer token from the Authorization header, falling back to ?token=
 *  (EventSource/SSE cannot set custom headers). */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const q = req.query.token;
  if (typeof q === 'string' && q) return q;
  return null;
}

/** Verify the request carries a valid Supabase token belonging to an admin. */
export async function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { data, error } = await getAnonClient().auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const { data: profile } = await getServiceClient()
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    req.user = { id: data.user.id, email: data.user.email ?? '' };
    next();
  } catch (err) {
    logger.error({ err: String(err) }, 'requireAdmin failed');
    res.status(500).json({ error: 'Authentication check failed' });
  }
}
