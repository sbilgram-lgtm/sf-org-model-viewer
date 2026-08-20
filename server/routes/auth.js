const express = require('express');
const jsforce = require('jsforce');
const router = express.Router();

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

  req.session.loginUrl = loginUrl;
  req.session.clientId = clientId;
  req.session.clientSecret = clientSecret;

  const callbackUrl = process.env.SF_CALLBACK_URL || `${getBaseUrl(req)}/auth/callback`;

  const oauth2 = new jsforce.OAuth2({
    loginUrl,
    clientId,
    clientSecret,
    redirectUri: callbackUrl,
  });

  res.redirect(oauth2.getAuthorizationUrl({ scope: 'api id' }));
});

router.get('/callback', async (req, res) => {
  const { loginUrl, clientId, clientSecret } = req.session;
  const callbackUrl = process.env.SF_CALLBACK_URL || `${getBaseUrl(req)}/auth/callback`;

  if (!clientId || !clientSecret) {
    return res.redirect(`${getBaseUrl(req)}/?error=session_error`);
  }

  const oauth2 = new jsforce.OAuth2({
    loginUrl: loginUrl || 'https://login.salesforce.com',
    clientId,
    clientSecret,
    redirectUri: callbackUrl,
  });

  const conn = new jsforce.Connection({ oauth2 });

  try {
    await conn.authorize(req.query.code);
    const identity = await conn.identity();
    req.session.sf = {
      accessToken: conn.accessToken,
      instanceUrl: conn.instanceUrl,
      userId: identity.user_id,
      orgId: identity.organization_id,
      displayName: identity.display_name,
    };
    const base = process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5173');
    res.redirect(base);
  } catch (err) {
    console.error('OAuth callback error:', err);
    const base = process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5173');
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
