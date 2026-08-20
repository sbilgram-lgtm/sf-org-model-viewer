const express = require('express');
const crypto = require('crypto');
const jsforce = require('jsforce');
const axios = require('axios');
const router = express.Router();

function generatePkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) return `${req.protocol}://${req.get('host')}`;
  return 'http://localhost:5173';
}

router.get('/login', (req, res) => {
  const loginUrl = (req.query.loginUrl || process.env.SF_LOGIN_URL || 'https://login.salesforce.com').replace(/\/$/, '');
  const clientId = req.query.clientId || process.env.SF_CLIENT_ID;
  const clientSecret = req.query.clientSecret || process.env.SF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect(`${getBaseUrl(req)}/?error=missing_credentials`);
  }

  const callbackUrl = process.env.SF_CALLBACK_URL || `${getBaseUrl(req)}/auth/callback`;
  const { verifier, challenge } = generatePkce();

  req.session.loginUrl = loginUrl;
  req.session.clientId = clientId;
  req.session.clientSecret = clientSecret;
  req.session.pkceVerifier = verifier;
  req.session.callbackUrl = callbackUrl;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: 'api id',
  });

  res.redirect(`${loginUrl}/services/oauth2/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const { loginUrl, clientId, clientSecret, pkceVerifier, callbackUrl } = req.session;
  const base = process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5173');

  if (!clientId || !pkceVerifier) {
    return res.redirect(`${base}/?error=session_error`);
  }

  try {
    const tokenRes = await axios.post(
      `${loginUrl || 'https://login.salesforce.com'}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl || `${base}/auth/callback`,
        code: req.query.code,
        code_verifier: pkceVerifier,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, instance_url, id } = tokenRes.data;
    const conn = new jsforce.Connection({ accessToken: access_token, instanceUrl: instance_url });
    const identity = await conn.identity();

    req.session.sf = {
      accessToken: access_token,
      instanceUrl: instance_url,
      userId: identity.user_id,
      orgId: identity.organization_id,
      displayName: identity.display_name,
    };

    res.redirect(base);
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data || err.message);
    res.redirect(`${base}/?error=auth_failed`);
  }
});

router.get('/status', (req, res) => {
  if (req.session.sf) {
    res.json({
      authenticated: true,
      user: {
        name: req.session.sf.displayName,
        orgId: req.session.sf.orgId,
        instanceUrl: req.session.sf.instanceUrl,
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
