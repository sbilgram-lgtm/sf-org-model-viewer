const express = require('express');
const jsforce = require('jsforce');
const router = express.Router();

const oauth2 = new jsforce.OAuth2({
  clientId: process.env.SF_CLIENT_ID,
  clientSecret: process.env.SF_CLIENT_SECRET,
  redirectUri: process.env.SF_CALLBACK_URL || 'http://localhost:3001/auth/callback',
});

router.get('/login', (req, res) => {
  res.redirect(oauth2.getAuthorizationUrl({ scope: 'api id' }));
});

router.get('/callback', async (req, res) => {
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
    res.redirect('http://localhost:5173');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Authentication failed');
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
