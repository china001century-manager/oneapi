import { createHash } from 'node:crypto';

function addresses(field) {
  return field?.value?.map(({ address }) => address).filter(Boolean) ?? [];
}

export function toAgentMailPayload(message, envelopeRecipients) {
  const to = addresses(message.to);
  const cc = addresses(message.cc);
  const visible = new Set([...to, ...cc].map((address) => address.toLowerCase()));
  const bcc = envelopeRecipients.filter((address) => !visible.has(address.toLowerCase()));

  const payload = {
    to: to.length ? to : envelopeRecipients,
    subject: message.subject ?? '',
  };

  if (cc.length) payload.cc = cc;
  if (bcc.length && to.length) payload.bcc = bcc;
  if (message.replyTo) payload.reply_to = addresses(message.replyTo);
  if (message.text) payload.text = message.text;
  if (typeof message.html === 'string') payload.html = message.html;
  if (message.attachments?.length) {
    payload.attachments = message.attachments.map((attachment) => ({
      filename: attachment.filename ?? 'attachment',
      content_type: attachment.contentType,
      content_disposition: attachment.contentDisposition === 'inline' ? 'inline' : 'attachment',
      ...(attachment.cid ? { content_id: attachment.cid } : {}),
      content: attachment.content.toString('base64'),
    }));
  }

  return payload;
}

export function idempotencyKey(message, envelopeRecipients) {
  const bodyHash = createHash('sha256')
    .update(`${message.text ?? ''}\n${typeof message.html === 'string' ? message.html : ''}`)
    .digest('hex');

  return createHash('sha256')
    .update(JSON.stringify({
      messageId: message.messageId,
      date: message.date?.toISOString(),
      subject: message.subject,
      recipients: [...envelopeRecipients].sort(),
      bodyHash,
    }))
    .digest('hex');
}
