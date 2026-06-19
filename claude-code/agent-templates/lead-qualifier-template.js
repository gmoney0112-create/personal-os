// Lead Qualifier Agent — Core Logic Structure
// Deploy: React + Tailwind → Netlify | Data: Supabase | CRM: GHL

const LeadQualifier = {
  intake: {
    fields: ['name', 'business_type', 'monthly_revenue', 'pain_point', 'budget', 'contact_method'],
    ghlWebhook: process.env.GHL_WEBHOOK_URL, // set in Supabase secrets
  },

  scoring: {
    disqualify_if: ['revenue < $10k/mo', 'budget = $0'],
    score_multipliers: {
      HVAC: 1.5,
      tree_care: 1.5,
      cleaning: 1.2,
      property_mgmt: 1.2,
    },
    thresholds: {
      hot: 80,   // → calendar booking + SMS confirmation
      warm: 50,  // → GHL nurture sequence
      cold: 0,   // → archive with "not-ready" tag
    },
  },

  routing: {
    hot: 'immediate_calendar_book',   // Calendly link + SMS
    warm: 'nurture_sequence_ghl',     // GHL email sequence
    cold: 'disqualify_tag',           // archive
  },
};

// Prompt to use with Claude Code:
// "Build me a Lead Qualifier Agent for [CLIENT_NAME].
//  Use the scoring logic and routing above.
//  Deploy to Netlify. Store leads in Supabase. Push scores to GHL."

module.exports = LeadQualifier;
