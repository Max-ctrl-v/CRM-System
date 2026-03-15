const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { BetaAnalyticsDataClient } = require('@google-analytics/data').v1beta;

const GA_PROPERTY_ID = '527328631';

const credentials = {
  type: 'service_account',
  project_id: process.env.GA_PROJECT_ID || 'testing-487401',
  private_key_id: process.env.GA_PRIVATE_KEY_ID || '',
  private_key: (process.env.GA_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  client_email: process.env.GA_CLIENT_EMAIL || '',
  client_id: process.env.GA_CLIENT_ID || '',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};

let analyticsClient = null;

function getClient() {
  if (!analyticsClient) {
    analyticsClient = new BetaAnalyticsDataClient({ credentials });
  }
  return analyticsClient;
}

// GET /api/analytics/overview?range=30
router.get('/overview', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const rows = (response.rows || []).map(row => ({
      date: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value),
      newUsers: parseInt(row.metricValues[1].value),
      sessions: parseInt(row.metricValues[2].value),
      pageViews: parseInt(row.metricValues[3].value),
      avgSessionDuration: parseFloat(row.metricValues[4].value),
      bounceRate: parseFloat(row.metricValues[5].value),
    }));

    // Calculate totals
    const totals = rows.reduce((acc, r) => ({
      activeUsers: acc.activeUsers + r.activeUsers,
      newUsers: acc.newUsers + r.newUsers,
      sessions: acc.sessions + r.sessions,
      pageViews: acc.pageViews + r.pageViews,
    }), { activeUsers: 0, newUsers: 0, sessions: 0, pageViews: 0 });

    const avgBounce = rows.length > 0
      ? rows.reduce((s, r) => s + r.bounceRate, 0) / rows.length
      : 0;
    const avgDuration = rows.length > 0
      ? rows.reduce((s, r) => s + r.avgSessionDuration, 0) / rows.length
      : 0;

    res.json({ rows, totals: { ...totals, avgBounceRate: avgBounce, avgSessionDuration: avgDuration } });
  } catch (err) {
    console.error('Analytics overview error:', err.message);
    res.status(500).json({ error: 'Analytics-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/pages?range=30
router.get('/pages', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 20,
    });

    const pages = (response.rows || []).map(row => ({
      title: row.dimensionValues[0].value,
      path: row.dimensionValues[1].value,
      views: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      avgDuration: parseFloat(row.metricValues[2].value),
    }));

    res.json({ pages });
  } catch (err) {
    console.error('Analytics pages error:', err.message);
    res.status(500).json({ error: 'Seiten-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/geo?range=30
router.get('/geo', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'country' }, { name: 'region' }, { name: 'city' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 50,
    });

    const locations = (response.rows || []).map(row => ({
      country: row.dimensionValues[0].value,
      region: row.dimensionValues[1].value,
      city: row.dimensionValues[2].value,
      users: parseInt(row.metricValues[0].value),
      sessions: parseInt(row.metricValues[1].value),
      pageViews: parseInt(row.metricValues[2].value),
    }));

    res.json({ locations });
  } catch (err) {
    console.error('Analytics geo error:', err.message);
    res.status(500).json({ error: 'Geo-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/sources?range=30
router.get('/sources', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20,
    });

    const sources = (response.rows || []).map(row => ({
      source: row.dimensionValues[0].value,
      medium: row.dimensionValues[1].value,
      users: parseInt(row.metricValues[0].value),
      sessions: parseInt(row.metricValues[1].value),
      pageViews: parseInt(row.metricValues[2].value),
    }));

    res.json({ sources });
  } catch (err) {
    console.error('Analytics sources error:', err.message);
    res.status(500).json({ error: 'Quellen-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/devices?range=30
router.get('/devices', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }, { name: 'browser' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20,
    });

    const devices = (response.rows || []).map(row => ({
      device: row.dimensionValues[0].value,
      browser: row.dimensionValues[1].value,
      users: parseInt(row.metricValues[0].value),
      sessions: parseInt(row.metricValues[1].value),
    }));

    res.json({ devices });
  } catch (err) {
    console.error('Analytics devices error:', err.message);
    res.status(500).json({ error: 'Geräte-Daten konnten nicht geladen werden.' });
  }
});

module.exports = router;
