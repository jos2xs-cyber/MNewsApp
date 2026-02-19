import nodemailer from 'nodemailer';
import { RankedArticle, WeatherForecast } from '../types';
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

function formatTemperature(value: number): string {
  return `${Math.round(value)} F`;
}

function formatRainChance(value: number): string {
  return `${Math.round(value)}%`;
}

function iconForDescription(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes('thunder') || lower.includes('storm') || lower.includes('lightning')) {
    return '&#9928;';
  }
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    return '&#127783;';
  }
  if (lower.includes('snow') || lower.includes('sleet') || lower.includes('ice')) {
    return '&#10052;';
  }
  if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze')) {
    return '&#127787;';
  }
  if (lower.includes('partly') || lower.includes('mostly sunny') || lower.includes('sun and cloud')) {
    return '&#9925;';
  }
  if (lower.includes('cloud') || lower.includes('overcast')) {
    return '&#9729;';
  }
  if (lower.includes('clear') || lower.includes('sunny')) {
    return '&#9728;';
  }
  return '&#8226;';
}

function getDisplayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function buildWeatherSection(weather: WeatherForecast | null): string {
  if (!weather || weather.forecast.length === 0) {
    return '';
  }

  const cards = weather.forecast
    .slice(0, 3)
    .map(
      (day) => `<td style="width:33.33%;vertical-align:top;padding:5px;">
          <div style="border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:6px;">
            <p style="margin:0 0 3px;color:#0369a1;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${sanitizeText(day.weekday || day.date)}</p>
            <div style="display:flex;align-items:center;gap:5px;">
              <span aria-hidden="true" style="font-size:16px;line-height:1;">${iconForDescription(day.description)}</span>
              <p style="margin:0;color:#0f172a;font-size:13px;font-weight:700;">${sanitizeText(day.description)}</p>
            </div>
            <p style="margin:0;color:#1e293b;font-size:11px;">${formatTemperature(day.maxTempF)} / ${formatTemperature(day.minTempF)}</p>
            <p style="margin:3px 0 0;color:#475569;font-size:10px;">Rain ${formatRainChance(day.chanceOfRain)}</p>
          </div>
        </td>`
    )
    .join('');

  return `<section id="weather" style="margin-top:16px;margin-bottom:14px;">
      <div style="border-radius:14px;border:1px solid #7dd3fc;background:linear-gradient(180deg,#ecfeff,#f8fafc);padding:12px;">
        <p style="margin:0;color:#0f172a;font-size:16px;font-weight:700;">Weather outlook: ${sanitizeText(weather.location)}</p>
        <p style="margin:3px 0 8px;color:#475569;font-size:11px;">Included with today's digest.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <tr>${cards}</tr>
        </table>
      </div>
    </section>`;
}

function buildHtml(articles: RankedArticle[], weather: WeatherForecast | null): string {
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
  const weatherSection = buildWeatherSection(weather);
  const categoryOrder = ['food', 'local', 'business', 'tech', 'finance', 'ai', 'lifestyle', 'world', 'politics'];

  const sections = Array.from(grouped.entries())
    .sort(([a], [b]) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      return a.localeCompare(b);
    })
    .map(([category, list], index) => {
      const paletteEntry = palette[category] ?? { tint: '#eef2ff', accent: '#cbd5f5' };
      const topSpacing = index === 0 ? '38px' : '26px';
      const items = list
        .map(
          (a) => `<article style="padding:18px 20px;border-radius:16px;margin:12px 0;background:#fff;box-shadow:0 18px 45px rgba(15,23,42,0.08);border:1px solid rgba(15,23,42,0.08);">
              <h3 style="margin:0 0 10px;color:#0f172a;font-size:21px;line-height:1.4;">${sanitizeText(a.title)}</h3>
              <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">${sanitizeText(a.summary)}</p>
              <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:12px;color:#475569;">
                <a href="${a.url}" title="Click to read" style="color:#0f766e;text-decoration:underline;font-weight:600;word-break:break-all;">
                  ${sanitizeText(getDisplayDomain(a.url))}
                </a>
                <span>${new Date().toLocaleDateString()}</span>
              </div>
            </article>`
        )
        .join('');
      return `<section id="${category}">
        <details open style="border-radius:20px;background:${paletteEntry.tint};margin-top:${topSpacing};overflow:hidden;border:1px solid ${paletteEntry.accent};box-shadow:0 15px 50px rgba(15,23,42,0.08);">
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
      <div style="text-align:center;">
        <h1 style="margin:0 0 14px 0;display:block;color:#0b1324;font-size:42px;line-height:1.12;letter-spacing:0.04em;font-family:'Old English Text MT','Engravers MT','Times New Roman',serif;text-shadow:0 1px 0 #e2e8f0;">
          ${newsletterTitle}
        </h1>
        <p style="margin:0;display:block;color:#475569;font-size:14px;">Generated ${new Date().toLocaleString()}</p>
      </div>
      ${weatherSection}
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

export async function sendDigestEmail(
  recipients: string[],
  articles: RankedArticle[],
  weather: WeatherForecast | null = null
): Promise<void> {
  try {
    logger.info(`Attempting SMTP send to ${recipients.join(', ')} with ${articles.length} articles`);
    const info = await getTransporter().sendMail({
      from: formatFromAddress(),
      to: recipients,
      subject: `Daily News Digest (${articles.length} stories)`,
      html: buildHtml(articles, weather),
      text: [
        weather && weather.forecast.length > 0
          ? `Weather (${weather.location}): ${weather.forecast
              .slice(0, 3)
              .map((day) => `${day.weekday || day.date} ${Math.round(day.maxTempF)}/${Math.round(day.minTempF)}F Rain ${Math.round(day.chanceOfRain)}%`)
              .join(' | ')}`
          : '',
        articles.map((a) => `- ${a.title}\nURL: ${a.url}\n${a.summary}`).join('\n\n')
      ]
        .filter(Boolean)
        .join('\n\n')
    });
    logger.info(`SMTP send success: messageId=${info.messageId}`);
  } catch (error) {
    const details = formatMailerError(error);
    logger.error(`SMTP send failed: ${details}`);
    throw new Error(`Email delivery failed: ${details}`);
  }
}
