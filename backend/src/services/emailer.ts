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

function formatFromAddress(): string {
  const user = process.env.GMAIL_USER?.trim();
  if (!user) {
    return 'The Two-Person Times';
  }
  return `"The Two-Person Times" <${user}>`;
}

function buildHtml(articles: RankedArticle[]): string {
  const grouped = new Map<string, RankedArticle[]>();
  for (const article of articles) {
    const list = grouped.get(article.category) ?? [];
    list.push(article);
    grouped.set(article.category, list);
  }

  const palette: Record<string, { tint: string; accent: string }> = {
    business: { tint: '#fff9f3', accent: '#fde68a' },
    tech: { tint: '#f0f9ff', accent: '#bae6fd' },
    finance: { tint: '#fefce8', accent: '#fde68a' },
    ai: { tint: '#f3f4ff', accent: '#c7d2fe' },
    lifestyle: { tint: '#fdf2f8', accent: '#fbcfe8' },
    local: { tint: '#f9fafb', accent: '#e2e8f0' },
    food: { tint: '#fff4f4', accent: '#fecdd3' },
    world: { tint: '#f5f5ff', accent: '#c4b5fd' },
    politics: { tint: '#fff5f5', accent: '#fecaca' }
  };

  const pillColors: Record<string, string> = {
    business: '#fde68a',
    tech: '#bae6fd',
    finance: '#ecfccb',
    ai: '#c7d2fe',
    lifestyle: '#fbcfe8',
    local: '#e2e8f0',
    food: '#fecdd3',
    world: '#c4b5fd',
    politics: '#fecaca'
  };

  const newsletterTitle = 'The Two-Person Times';
  const friendlyName = (key: string) => key.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const sections = Array.from(grouped.entries())
    .map(([category, list]) => {
      const paletteEntry = palette[category] ?? { tint: '#eef2ff', accent: '#cbd5f5' };
      const items = list
        .map(
          (a) => `<article style="padding:18px 20px;border-radius:16px;margin:12px 0;background:#fff;box-shadow:0 18px 45px rgba(15,23,42,0.08);border:1px solid rgba(15,23,42,0.08);">
              <h3 style="margin:0 0 10px;color:#0f172a;font-size:21px;line-height:1.4;">${sanitizeText(a.title)}</h3>
              <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">${sanitizeText(a.summary)}</p>
              <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:12px;color:#475569;">
                <span style="font-weight:600;letter-spacing:0.08em;">Source</span>
                <span><strong>${sanitizeText(a.source)}</strong></span>
                <span>${new Date().toLocaleDateString()}</span>
              </div>
              <div style="margin-top:12px;">
                <a href="${a.url}" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;background:linear-gradient(135deg,#0ea5e9,#14b8a6);color:#fff;font-size:12px;font-weight:600;text-decoration:none;">
                  Read the article on the source site
                  <span style="font-size:12px;">→</span>
                </a>
              </div>
            </article>`
        )
        .join('');
      return `<section id="${category}">
        <details open style="border-radius:20px;background:${paletteEntry.tint};margin-top:26px;overflow:hidden;border:1px solid ${paletteEntry.accent};box-shadow:0 15px 50px rgba(15,23,42,0.08);">
          <summary style="list-style:none;margin:0;padding:18px 22px;font-size:22px;font-weight:700;color:#0f172a;background:${paletteEntry.tint};cursor:pointer;border-bottom:1px solid ${paletteEntry.accent};">
            <span style="display:inline-flex;align-items:center;gap:8px;background:${pillColors[category] ?? '#e2e8f0'};padding:6px 12px;border-radius:999px;border:1px solid rgba(15,23,42,0.15);font-size:16px;line-height:1;">${friendlyName(category)}</span>
          </summary>
          <div style="background:#fff;padding:16px;border-top:1px solid ${paletteEntry.accent};">
            ${items}
          </div>
        </details>
      </section>`;
    })
    .join('');

  return `<!doctype html>
<html>
  <body style="font-family:'Times New Roman',serif;background:#e2e8f0;padding:28px;">
    <div style="max-width:820px;margin:0 auto;background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 30px 60px rgba(15,23,42,0.12);">
      <div style="display:flex;flex-direction:column;gap:6px;">
        <h1 style="margin:0;color:#0f172a;font-size:32px;line-height:1.2;font-family:'Engravers Old English BT','Times New Roman',serif;">${newsletterTitle}</h1>
        <p style="margin:0;color:#475569;font-size:14px;">Generated ${new Date().toLocaleString()}</p>
      </div>
      ${sections}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 8px;" />
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
      from: formatFromAddress(),
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
