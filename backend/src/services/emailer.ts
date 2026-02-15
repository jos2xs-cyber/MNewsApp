import nodemailer from 'nodemailer';
import { RankedArticle } from '../types';
import { sanitizeText } from '../utils/sanitize';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) {
    throw new Error('Missing Gmail credentials in env: set GMAIL_USER and GMAIL_APP_PASSWORD');
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    dnsTimeout: 10000,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

function buildHtml(articles: RankedArticle[]): string {
  const grouped = new Map<string, RankedArticle[]>();
  for (const article of articles) {
    const list = grouped.get(article.category) ?? [];
    list.push(article);
    grouped.set(article.category, list);
  }

  const palette: Record<string, string> = {
    business: '#fef3c7',
    tech: '#e0f2fe',
    finance: '#ecfccb'
  };

  const sections = Array.from(grouped.entries())
    .map(([category, list]) => {
      const background = palette[category] ?? '#e2e8f0';
      const items = list
        .map(
          (a) => `<article style="padding:18px 20px;border-radius:12px;margin:12px 0;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,0.06);border:1px solid rgba(15,23,42,0.08);">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#475569;letter-spacing:0.2em;">${category}</span>
                <span style="width:4rem;height:2px;background:${background};display:inline-block;border-radius:2px;"></span>
              </div>
              <h3 style="margin:0 0 10px;color:#0f172a;font-size:20px;line-height:1.3;">${sanitizeText(a.title)}</h3>
              <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">${sanitizeText(a.summary)}</p>
              <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:12px;color:#64748b;">
                <span>Source: <strong style="color:#0f172a;">${sanitizeText(a.source)}</strong></span>
                <span>${new Date().toLocaleDateString()}</span>
              </div>
              <div style="margin-top:12px;">
                <a href="${a.url}" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:999px;background:linear-gradient(135deg,#0ea5e9,#14b8a6);color:#fff;font-size:13px;font-weight:600;text-decoration:none;">
                  Read the article on the source site
                  <span style="font-size:12px;">↗</span>
                </a>
              </div>
            </article>`
        )
        .join('');
      return `<section style="margin-top:26px;border-radius:18px;background:linear-gradient(180deg,#fef3c7,#fef3c7),linear-gradient(180deg,${background},${background});box-shadow:0 20px 60px rgba(15,23,42,0.08);">
        <div style="margin-bottom:12px;padding:12px 16px;border-radius:18px 18px 0 0;background:${background};">
            <h2 style="margin:6px 0 0;font-size:24px;color:#0b1c3a;text-transform:capitalize;">${category}</h2>
        </div>
        <div style="background:#fff;border-radius:0 0 18px 18px;padding:16px;">
          ${items}
        </div>
      </section>`;
    })
    .join('');

  return `<!doctype html>
<html>
  <body style="font-family:'Segoe UI',Inter,Arial,sans-serif;background:#f1f5f9;padding:28px;">
    <div style="max-width:760px;margin:0 auto;background:#fff;padding:28px;border-radius:12px;border:1px solid #e2e8f0;">
      <h1 style="margin:0;color:#0f172a;font-size:30px;line-height:1.2;">Daily AI News Digest</h1>
      <p style="margin:8px 0 0;color:#475569;font-size:13px;">Generated ${new Date().toLocaleString()}</p>
      ${sections}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0 10px;" />
      <p style="margin:0;color:#94a3b8;font-size:11px;">This digest was generated automatically by your local News Digest Manager.</p>
    </div>
  </body>
</html>`;
}

function formatMailerError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown mail error';
  }

  const withProps = error as Error & {
    code?: string;
    command?: string;
    responseCode?: number;
    response?: string;
  };

  const parts = [
    `message=${withProps.message}`,
    `code=${withProps.code ?? 'n/a'}`,
    `command=${withProps.command ?? 'n/a'}`,
    `responseCode=${withProps.responseCode ?? 'n/a'}`
  ];
  if (withProps.response) {
    parts.push(`response=${withProps.response}`);
  }
  return parts.join(' | ');
}

export async function sendDigestEmail(recipients: string[], articles: RankedArticle[]): Promise<void> {
  try {
    logger.info(`Attempting SMTP send to ${recipients.join(', ')} with ${articles.length} articles`);
    const info = await getTransporter().sendMail({
      from: process.env.GMAIL_USER,
      to: recipients,
      subject: `Daily News Digest (${articles.length} stories)`,
      html: buildHtml(articles),
      text: articles
        .map((a) => `- ${a.title}\nSource: ${a.source}\nRead: ${a.url}\n${a.summary}`)
        .join('\n\n')
    });
    logger.info(`SMTP send success: messageId=${info.messageId}`);
  } catch (error) {
    const details = formatMailerError(error);
    logger.error(`SMTP send failed: ${details}`);
    throw new Error(`Email delivery failed: ${details}`);
  }
}
