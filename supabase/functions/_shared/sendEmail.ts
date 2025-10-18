// @ts-nocheck
export async function sendEmail({ to, from, subject, content, isHtml}: {
  to: string
  from: string
  subject: string
  content: string
  isHtml?: boolean
}) {
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  if (!SENDGRID_API_KEY) {
    throw new Error("Missing SENDGRID_API_KEY");
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: isHtml ? "text/html" : "text/plain", value: content }],
    }),
  });

  const text = await res.text();
  console.log("📨 SendGrid response:", res.status, text);

  if (!res.ok) {
    throw new Error(`SendGrid error ${res.status}: ${text}`);
  }

  return `✅ SendGrid accepted (status ${res.status})`;
}