/** RFC 2822 mínimo para interoperabilidad con clientes Nmail. */
export function buildRfc2822Message(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
  messageId?: string;
}): string {
  const date = new Date().toUTCString();
  const mid = params.messageId ?? `${Date.now()}@emaildex.link4deal`;
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject.replace(/\r?\n/g, ' ')}`,
    `Date: ${date}`,
    `Message-ID: <${mid}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
  ].join('\r\n');
  return `${headers}${params.body.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')}`;
}

export function parseRfc2822Message(raw: string): { subject: string; body: string; from: string; to: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  const split = normalized.indexOf('\n\n');
  const head = split >= 0 ? normalized.slice(0, split) : normalized;
  const body = split >= 0 ? normalized.slice(split + 2).trim() : '';
  const pick = (name: string) => {
    const re = new RegExp(`^${name}:\\s*(.+)$`, 'im');
    const m = head.match(re);
    return m?.[1]?.trim() ?? '';
  };
  return {
    from: pick('From'),
    to: pick('To'),
    subject: pick('Subject'),
    body,
  };
}
