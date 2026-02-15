const secrets = [
  process.env.OPENAI_API_KEY,
  process.env.ANTHROPIC_API_KEY,
  process.env.GMAIL_APP_PASSWORD
].filter(Boolean) as string[];

function redact(message: string): string {
  let output = message;
  secrets.forEach((secret) => {
    output = output.replaceAll(secret, '[REDACTED]');
  });
  return output;
}

export const logger = {
  info(message: string): void {
    console.info(redact(message));
  },
  warn(message: string): void {
    console.warn(redact(message));
  },
  error(message: string): void {
    console.error(redact(message));
  }
};
