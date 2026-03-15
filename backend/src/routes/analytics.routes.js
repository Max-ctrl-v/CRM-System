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

const prop = `properties/${GA_PROPERTY_ID}`;

// GET /api/analytics/overview?range=30
router.get('/overview', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'screenPageViewsPerSession' },
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
      pagesPerSession: parseFloat(row.metricValues[6].value),
    }));

    const totals = rows.reduce((acc, r) => ({
      activeUsers: acc.activeUsers + r.activeUsers,
      newUsers: acc.newUsers + r.newUsers,
      sessions: acc.sessions + r.sessions,
      pageViews: acc.pageViews + r.pageViews,
    }), { activeUsers: 0, newUsers: 0, sessions: 0, pageViews: 0 });

    const avgBounce = rows.length > 0
      ? rows.reduce((s, r) => s + r.bounceRate, 0) / rows.length : 0;
    const avgDuration = rows.length > 0
      ? rows.reduce((s, r) => s + r.avgSessionDuration, 0) / rows.length : 0;
    const avgPagesPerSession = rows.length > 0
      ? rows.reduce((s, r) => s + r.pagesPerSession, 0) / rows.length : 0;

    res.json({ rows, totals: { ...totals, avgBounceRate: avgBounce, avgSessionDuration: avgDuration, avgPagesPerSession } });
  } catch (err) {
    console.error('Analytics overview error:', err.message);
    res.status(500).json({ error: 'Analytics-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/realtime
router.get('/realtime', auth, async (req, res) => {
  try {
    const client = getClient();
    const [response] = await client.runRealtimeReport({
      property: prop,
      dimensions: [{ name: 'unifiedScreenName' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const activeNow = (response.rows || []).reduce((s, r) => s + parseInt(r.metricValues[0].value), 0);
    const pages = (response.rows || []).map(row => ({
      page: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
    })).sort((a, b) => b.users - a.users);

    // Also get realtime by country
    const [geoResponse] = await client.runRealtimeReport({
      property: prop,
      dimensions: [{ name: 'country' }, { name: 'city' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const realtimeGeo = (geoResponse.rows || []).map(row => ({
      country: row.dimensionValues[0].value,
      city: row.dimensionValues[1].value,
      users: parseInt(row.metricValues[0].value),
    })).sort((a, b) => b.users - a.users);

    // Realtime by source
    const [srcResponse] = await client.runRealtimeReport({
      property: prop,
      dimensions: [{ name: 'firstUserSource' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const realtimeSources = (srcResponse.rows || []).map(row => ({
      source: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
    })).sort((a, b) => b.users - a.users);

    res.json({ activeNow, pages, geo: realtimeGeo, sources: realtimeSources });
  } catch (err) {
    console.error('Analytics realtime error:', err.message);
    res.status(500).json({ error: 'Echtzeit-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/pages?range=30
router.get('/pages', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
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
      bounceRate: parseFloat(row.metricValues[3].value),
    }));

    res.json({ pages });
  } catch (err) {
    console.error('Analytics pages error:', err.message);
    res.status(500).json({ error: 'Seiten-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/userflow?range=30
router.get('/userflow', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    // Landing pages (entry points)
    const [landingRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 15,
    });

    const landingPages = (landingRes.rows || []).map(row => ({
      path: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      bounceRate: parseFloat(row.metricValues[2].value),
    }));

    // Exit pages
    const [exitRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 15,
    });

    const exitPages = (exitRes.rows || []).map(row => ({
      path: row.dimensionValues[0].value,
      views: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    }));

    res.json({ landingPages, exitPages });
  } catch (err) {
    console.error('Analytics userflow error:', err.message);
    res.status(500).json({ error: 'Nutzerfluss-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/events?range=30
router.get('/events', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 30,
    });

    const events = (response.rows || []).map(row => ({
      name: row.dimensionValues[0].value,
      count: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    }));

    // Events over time (for conversion tracking)
    const [timeRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: {
            values: ['form_submit', 'click', 'file_download', 'scroll', 'first_visit', 'generate_lead', 'contact_form', 'page_view'],
          },
        },
      },
    });

    const eventsOverTime = {};
    for (const row of timeRes.rows || []) {
      const date = row.dimensionValues[0].value;
      const event = row.dimensionValues[1].value;
      if (!eventsOverTime[date]) eventsOverTime[date] = { date };
      eventsOverTime[date][event] = parseInt(row.metricValues[0].value);
    }

    res.json({ events, eventsOverTime: Object.values(eventsOverTime) });
  } catch (err) {
    console.error('Analytics events error:', err.message);
    res.status(500).json({ error: 'Event-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/geo?range=30
router.get('/geo', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: prop,
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
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
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
      bounceRate: parseFloat(row.metricValues[3].value),
    }));

    res.json({ sources });
  } catch (err) {
    console.error('Analytics sources error:', err.message);
    res.status(500).json({ error: 'Quellen-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/acquisition?range=30 — keywords, referrals, campaigns
router.get('/acquisition', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    // Organic search terms (if available)
    const [searchRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'newUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });

    const channels = (searchRes.rows || []).map(row => ({
      channel: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      newUsers: parseInt(row.metricValues[2].value),
    }));

    // Referral sites
    const [refRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      dimensionFilter: {
        filter: {
          fieldName: 'sessionMedium',
          stringFilter: { value: 'referral', matchType: 'EXACT' },
        },
      },
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 15,
    });

    const referrals = (refRes.rows || []).map(row => ({
      source: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    }));

    // UTM Campaigns
    const [campRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'sessionCampaignName' }, { name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'newUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 15,
    });

    const campaigns = (campRes.rows || []).filter(r => r.dimensionValues[0].value !== '(not set)').map(row => ({
      campaign: row.dimensionValues[0].value,
      source: row.dimensionValues[1].value,
      medium: row.dimensionValues[2].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      newUsers: parseInt(row.metricValues[2].value),
    }));

    res.json({ channels, referrals, campaigns });
  } catch (err) {
    console.error('Analytics acquisition error:', err.message);
    res.status(500).json({ error: 'Akquisitions-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/audience?range=30 — new vs returning, language, screen resolution
router.get('/audience', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    // New vs Returning
    const [nvrRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
    });

    const newVsReturning = (nvrRes.rows || []).map(row => ({
      type: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
      sessions: parseInt(row.metricValues[1].value),
      pageViews: parseInt(row.metricValues[2].value),
      avgDuration: parseFloat(row.metricValues[3].value),
    }));

    // New vs Returning over time
    const [nvrTimeRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'newVsReturning' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const nvrOverTime = {};
    for (const row of nvrTimeRes.rows || []) {
      const date = row.dimensionValues[0].value;
      const type = row.dimensionValues[1].value;
      if (!nvrOverTime[date]) nvrOverTime[date] = { date, new: 0, returning: 0 };
      if (type === 'new') nvrOverTime[date].new = parseInt(row.metricValues[0].value);
      else nvrOverTime[date].returning = parseInt(row.metricValues[0].value);
    }

    // Language
    const [langRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'language' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    });

    const languages = (langRes.rows || []).map(row => ({
      language: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
      sessions: parseInt(row.metricValues[1].value),
    }));

    // Screen resolution
    const [screenRes] = await client.runReport({
      property: prop,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'screenResolution' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    });

    const screenResolutions = (screenRes.rows || []).map(row => ({
      resolution: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
    }));

    res.json({
      newVsReturning,
      newVsReturningOverTime: Object.values(nvrOverTime),
      languages,
      screenResolutions,
    });
  } catch (err) {
    console.error('Analytics audience error:', err.message);
    res.status(500).json({ error: 'Zielgruppen-Daten konnten nicht geladen werden.' });
  }
});

// GET /api/analytics/devices?range=30
router.get('/devices', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 30;
    const client = getClient();

    const [response] = await client.runReport({
      property: prop,
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

// GET /api/analytics/alerts — check for traffic spikes
router.get('/alerts', auth, async (req, res) => {
  try {
    const client = getClient();

    // Get last 7 days vs previous 7 days for comparison
    const [response] = await client.runReport({
      property: prop,
      dateRanges: [
        { startDate: '7daysAgo', endDate: 'today', name: 'current' },
        { startDate: '14daysAgo', endDate: '8daysAgo', name: 'previous' },
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'newUsers' },
      ],
    });

    const current = response.rows?.[0]?.metricValues || [];
    const previous = response.rows?.[0]?.metricValues || [];

    // GA4 returns metric values in order: current range first (indices 0-3), then previous range (indices 4-7)
    // But with runReport and multiple dateRanges, we may get multiple rows
    const getCurrent = (idx) => parseInt(current[idx]?.value || '0');
    const getPrevious = (idx) => parseInt(previous[idx + 4]?.value || current[idx]?.value || '0');

    const alerts = [];

    const metrics = [
      { name: 'Aktive Nutzer', curr: getCurrent(0), prev: getPrevious(0) },
      { name: 'Sitzungen', curr: getCurrent(1), prev: getPrevious(1) },
      { name: 'Seitenaufrufe', curr: getCurrent(2), prev: getPrevious(2) },
      { name: 'Neue Nutzer', curr: getCurrent(3), prev: getPrevious(3) },
    ];

    for (const m of metrics) {
      if (m.prev > 0) {
        const change = ((m.curr - m.prev) / m.prev) * 100;
        if (Math.abs(change) >= 50) {
          alerts.push({
            metric: m.name,
            current: m.curr,
            previous: m.prev,
            changePercent: change,
            type: change > 0 ? 'spike' : 'drop',
          });
        }
      }
    }

    // Check for unusual page traffic
    const [pageRes] = await client.runReport({
      property: prop,
      dateRanges: [
        { startDate: '1daysAgo', endDate: 'today' },
        { startDate: '8daysAgo', endDate: '2daysAgo' },
      ],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    });

    const pageAlerts = [];
    for (const row of pageRes.rows || []) {
      const todayViews = parseInt(row.metricValues[0]?.value || '0');
      const avgViews = parseInt(row.metricValues[1]?.value || '0') / 7;
      if (avgViews > 0 && todayViews > avgViews * 3) {
        pageAlerts.push({
          page: row.dimensionValues[0].value,
          todayViews,
          avgViews: Math.round(avgViews),
          multiplier: (todayViews / avgViews).toFixed(1),
        });
      }
    }

    res.json({ alerts, pageAlerts });
  } catch (err) {
    console.error('Analytics alerts error:', err.message);
    res.status(500).json({ error: 'Alert-Daten konnten nicht geladen werden.' });
  }
});

module.exports = router;
