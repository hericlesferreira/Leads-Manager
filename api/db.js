import { createClient } from '@supabase/supabase-js';

const STORE_ID = 'default';

function json(res, status, body) {
  res.status(status).json(body);
}

function isAuthorized(req) {
  const expected = process.env.APP_ACCESS_CODE;
  if (!expected) return true;
  return req.headers['x-leads-access-code'] === expected;
}

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variaveis de ambiente da Vercel.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!isAuthorized(req)) {
    json(res, 401, { error: 'Codigo de acesso invalido.' });
    return;
  }

  try {
    const supabase = getClient();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('leads_store')
        .select('data')
        .eq('id', STORE_ID)
        .maybeSingle();

      if (error) throw error;
      json(res, 200, data?.data || { months: {} });
      return;
    }

    if (req.method === 'POST') {
      const safeDb = {
        months: req.body?.months && typeof req.body.months === 'object' ? req.body.months : {}
      };

      const { error } = await supabase
        .from('leads_store')
        .upsert({
          id: STORE_ID,
          data: safeDb,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      json(res, 200, { ok: true });
      return;
    }

    json(res, 405, { error: 'Metodo nao permitido.' });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}
