import { timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { simpleParser } from 'mailparser';
import { SMTPServer } from 'smtp-server';
import { idempotencyKey, toAgentMailPayload } from './message.js';

const required = ['AGENTMAIL_API_KEY', 'AGENTMAIL_INBOX_ID', 'RELAY_USERNAME', 'RELAY_PASSWORD'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}
if (process.env.RELAY_PASSWORD.length < 24) {
  throw new Error('RELAY_PASSWORD must be at least 24 characters');
}

const inboxId = process.env.AGENTMAIL_INBOX_ID.toLowerCase();
const smtpPort = Number(process.env.SMTP_PORT ?? 2525);
const healthPort = Number(process.env.PORT ?? 8080);

function sameSecret(actual, expected) {
  const actualBuffer = Buffer.from(actual ?? '');
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function sendWithAgentMail(message, envelopeRecipients) {
  const response = await fetch(
    `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey(message, envelopeRecipients),
      },
      body: JSON.stringify(toAgentMailPayload(message, envelopeRecipients)),
    },
  );

  if (!response.ok) {
    throw new Error(`AgentMail returned HTTP ${response.status}`);
  }
}

const smtp = new SMTPServer({
  authMethods: ['PLAIN', 'LOGIN'],
  authOptional: false,
  disabledCommands: ['STARTTLS'],
  hideSTARTTLS: true,
  logger: false,
  size: 2 * 1024 * 1024,
  onAuth(auth, _session, callback) {
    const valid = sameSecret(auth.username, process.env.RELAY_USERNAME)
      && sameSecret(auth.password, process.env.RELAY_PASSWORD);
    if (!valid) return callback(new Error('Invalid relay credentials'));
    callback(null, { user: auth.username });
  },
  onMailFrom(address, _session, callback) {
    if (address.address.toLowerCase() !== inboxId) {
      return callback(new Error('Envelope sender is not allowed'));
    }
    callback();
  },
  onRcptTo(_address, session, callback) {
    if (session.envelope.rcptTo.length >= 50) {
      return callback(new Error('Too many recipients'));
    }
    callback();
  },
  async onData(stream, session, callback) {
    try {
      const message = await simpleParser(stream);
      if (stream.sizeExceeded) throw new Error('Message exceeds the 2 MB limit');
      const recipients = session.envelope.rcptTo.map(({ address }) => address);
      await sendWithAgentMail(message, recipients);
      console.log(JSON.stringify({ event: 'delivered', recipients: recipients.length }));
      callback();
    } catch (error) {
      console.error(JSON.stringify({ event: 'delivery_failed', error: error.message }));
      callback(error);
    }
  },
});

smtp.on('error', (error) => {
  console.error(JSON.stringify({ event: 'smtp_error', error: error.message }));
});

const health = http.createServer((request, response) => {
  if (request.url !== '/healthz') {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ ok: true }));
});

smtp.listen(smtpPort, '::', () => {
  console.log(JSON.stringify({ event: 'smtp_listening', port: smtpPort }));
});
health.listen(healthPort, '::', () => {
  console.log(JSON.stringify({ event: 'health_listening', port: healthPort }));
});
