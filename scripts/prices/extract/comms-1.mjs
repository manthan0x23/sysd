import { write, plan } from "./lib.mjs";

write("brevo", [plan("email:brevo:email", "Starter", 9, "month", { note: "Shown as $9 ('no Brevo logo' add-on $10.80/mo)." }), plan("email:brevo:email", "Standard", 18, "month"), plan("email:brevo:email", "Professional", 499, "month")], { notes: "Email send limits per plan not captured; Sales CRM seats: Essentials $27.92, Advanced $58.50/user/month (not relevant to email)." });
write("twilio", [
  plan("sms:twilio:sms-verify", "SMS long code, US outbound", null, "sms", { rates: [["outbound SMS", 0.0083, "sms"], ["inbound SMS", 0.0083, "sms"], ["outbound MMS", 0.022, "message"]], note: "US long-code rates; carrier fees extra. Toll-free/short-code rows exist on the page." }),
  plan("rtc:twilio:video-voice", "Video group room", null, "minute", { rates: [["per participant-minute", 0.004, "minute"]] }),
], { notes: "Verify (OTP) and voice prices are on other pages not fetched." });
write("onesignal", [
  plan("sms:onesignal:push", "Free / pay-as-you-go push", null, "month", { rates: [["email beyond 20,000 free sends", 1.5, "1k-emails"]], note: "Email: 20,000 free sends/month then $1.50 per 1,000. Mobile push for up to 1,000 MAU shown at $0.012 per MAU (truncated line)." }),
], { notes: "Plan names/base fees not reliably captured; an example bill on the page shows a $19 platform cost." });
write("messagebird", [plan("sms:messagebird:sms", "Bird email plans (from)", 15, "month", { note: "'Paid plans from $15/month' (email). SMS example: 10,000 segments = $70 (~$0.007/segment, AT&T fees included)." })], { notes: "MessageBird is now Bird (bird.com)." });
write("vonage", [plan("sms:vonage:sms", "SMS (US)", null, "sms", { rates: [["send", 0.0086, "sms"], ["receive", 0.00691, "sms"]], note: "Country not labelled in the scrape; other rates shown per country." })]);
write("meta", [], { notes: "WhatsApp Business pricing is per message category per country in a table not captured; only AI-agent comparison text came through. Prices NOT captured." });
