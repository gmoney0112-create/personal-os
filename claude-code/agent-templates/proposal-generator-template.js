// Proposal Generator Agent — Intake → PDF in 2 minutes → Payment link
// Revenue: $3,500-5,000. Converts prospects while you sleep.
// Deploy: Netlify | PDF: Puppeteer or PDFKit | Payments: Stripe | CRM: GHL

const ProposalGenerator = {
  intake: {
    source: 'Google Form OR GHL custom field',
    fields: [
      'business_name',
      'service_type',
      'current_challenges',
      'roi_goal_monthly',
      'timeline', // 'ASAP' | '30 days' | '90 days'
    ],
  },

  pdfBuilder: {
    engine: 'Puppeteer OR PDFKit',
    sections: [
      'client_name_and_logo',
      'problem_statement',
      'proposed_solution',   // AI agent type
      'timeline_deliverables',
      'investment_amount',   // links to Stripe checkout
      'digital_signature_field',
    ],
  },

  paymentFlow: {
    gateway: 'Stripe (primary) | FastPayDirect (backup)',
    webhook_sequence: [
      'Stripe webhook received',
      'Invoice created + stored in Supabase',
      'Confirm email + payment receipt sent',
      'GHL tag: "proposal-accepted"',
      'Trigger next workflow: project kick-off sequence',
    ],
  },
};

// Prompt to use with Claude Code:
// "Build me a Proposal Generator for [CLIENT_NAME].
//  Intake form → custom PDF proposal in under 2 minutes.
//  Include Stripe checkout link. On payment: tag in GHL + trigger kick-off.
//  Archive all proposals in Supabase. Deploy to Netlify."

module.exports = ProposalGenerator;
