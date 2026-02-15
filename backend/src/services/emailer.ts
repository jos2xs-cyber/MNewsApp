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

  const sections = Array.from(grouped.entries())
    .map(([category, list]) => {
      const items = list
        .map(
          (a) => `<article style="padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;margin:10px 0;background:#ffffff;">
              <h3 style="margin:0 0 8px;color:#0f172a;font-size:18px;line-height:1.35;">${sanitizeText(a.title)}</h3>
              <p style="margin:0 0 10px;color:#334155;font-size:14px;line-height:1.5;">${sanitizeText(a.summary)}</p>
              <p style="margin:0 0 10px;color:#64748b;font-size:12px;line-height:1.4;">
                Source: <span style="font-weight:600;color:#334155;">${sanitizeText(a.source)}</span> | ${new Date().toLocaleDateString()}
              </p>
            </article>`
        )
        .join('');
      return `<section style="margin-top:18px;">
        <h2 style="margin:0 0 10px;color:#0f172a;text-transform:capitalize;font-size:16px;letter-spacing:0.2px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
          ${category}
        </h2>
        ${items}
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

export async function sendDigestEmail(to: string, articles: RankedArticle[]): Promise<void> {
  try {
    logger.info(`Attempting SMTP send to ${to.replace(/(.{2}).+(@.*)/, '$1***$2')} with ${articles.length} articles`);
    const info = await getTransporter().sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject: `Daily News Digest (${articles.length} stories)`,
      html: buildHtml(articles),
      text: articles
        .map((a) => `- ${a.title}\nSource: ${a.source}\n${a.summary}`)
        .join('\n\n')
    });
    logger.info(`SMTP send success: messageId=${info.messageId}`);
  } catch (error) {
    const details = formatMailerError(error);
    logger.error(`SMTP send failed: ${details}`);
    throw new Error(`Email delivery failed: ${details}`);
  }
}
