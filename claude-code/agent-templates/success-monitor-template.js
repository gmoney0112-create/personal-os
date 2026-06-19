// Client Success Monitor — Metrics dashboard + KPI alerts + auto-escalation
// Revenue: $1,500-3,000. Proves ROI. Retention + upsell tool.
// Deploy: Netlify | Data: GHL + Calendly + Stripe + GA4

const SuccessMonitor = {
  dataSources: {
    ghl:      'leads qualified, scheduled, converted',
    calendly: 'booked vs. no-show rate',
    stripe:   'revenue collected',
    ga4:      'website traffic (property: set GA4_PROPERTY env var)',
  },

  kpis: [
    'leads_per_week',         // actual vs. target
    'conversion_rate_pct',
    'appointment_show_rate',
    'average_deal_size_usd',
    'monthly_revenue_impact',
    'roi_vs_investment_pct',
  ],

  alerts: {
    leads_below_50pct_target: 'email alert to agency',
    show_rate_below_80pct:    'escalate to client',
    revenue_down_20pct_wow:   'call the founder',
  },

  dashboard: {
    refresh_interval_ms: 5 * 60 * 1000, // 5 min
    weekly_csv_export:   true,
    next_agent_recommendation: true,     // surfaces bottleneck → upsell
  },
};

// Prompt to use with Claude Code:
// "Build me a Client Success Monitor Dashboard for [CLIENT_NAME].
//  Pull data from GHL, Calendly, Stripe, GA4.
//  Show the 6 KPIs above. Alert me on the 3 threshold violations.
//  Refresh every 5 min. Email weekly CSV. Deploy to Netlify."

module.exports = SuccessMonitor;
