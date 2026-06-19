// Appointment Scheduler Agent — Calendar + Objection Handling
// Chain after Lead Qualifier. Revenue: $5,500-7,500.
// Deploy: Netlify | Calendar: Calendly API | SMS: Twilio | CRM: GHL

const AppointmentScheduler = {
  integrations: {
    calendar: 'Calendly API (free tier)',
    sms: 'Twilio',
    crm: 'GHL webhook for lead updates',
    email: 'GHL or SendGrid for confirmations',
  },

  objectionHandling: {
    too_expensive: 'Show ROI calculator + case study',
    too_busy:      'Offer 15-min async video overview',
    need_to_think: 'Auto-schedule follow-up in 3 days + value reminder',
  },

  workflow: [
    '1. Lead lands on calendar page (from Lead Qualifier hot-lead route)',
    '2. User picks time slot via Calendly',
    '3. Objection detected? → handle per objectionHandling map above',
    '4. On booking confirmed: SMS + Email + Calendar invite sent',
    '5. Log all objection responses to Supabase for weekly review',
  ],

  confirmation: {
    channels: ['SMS', 'email', 'calendar_invite'],
    reminder_sequence: ['24h before', '2h before'],
  },
};

// Prompt to use with Claude Code:
// "Build me an Appointment Scheduler for [CLIENT_NAME].
//  Connect to Calendly. Handle objections (too expensive, too busy, need to think).
//  Send SMS + email + calendar invite on booking.
//  Log objection data to Supabase. Deploy to Netlify."

module.exports = AppointmentScheduler;
