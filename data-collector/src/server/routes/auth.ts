import { Router } from 'express';
import { getAnonClient, getServiceClient } from '../supabase.js';
import { requireAdmin, type AuthedRequest } from '../middleware/require-admin.js';
import { logger } from '../../utils/logger.js';

export const authRouter = Router();

// POST /api/auth/login — sign an editor in and confirm admin role
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre gerekli' });
  }

  try {
    const { data, error } = await getAnonClient().auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    const { data: profile } = await getServiceClient()
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Bu hesap admin değil' });
    }

    res.json({ access_token: data.session.access_token, email: data.user.email });
  } catch (err) {
    logger.error({ err: String(err) }, 'login failed');
    res.status(500).json({ error: 'Giriş sırasında hata oluştu' });
  }
});

// GET /api/auth/me — current session check (used on page load)
authRouter.get('/me', requireAdmin, (req: AuthedRequest, res) => {
  res.json({ email: req.user?.email });
});
