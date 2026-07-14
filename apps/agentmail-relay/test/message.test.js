import assert from 'node:assert/strict';
import test from 'node:test';
import { idempotencyKey, toAgentMailPayload } from '../src/message.js';

test('converts visible and envelope recipients', () => {
  const message = {
    to: { value: [{ address: 'to@example.com' }] },
    cc: { value: [{ address: 'cc@example.com' }] },
    subject: 'Verification code',
    text: '123456',
    html: '<strong>123456</strong>',
  };

  assert.deepEqual(
    toAgentMailPayload(message, ['to@example.com', 'cc@example.com', 'bcc@example.com']),
    {
      to: ['to@example.com'],
      cc: ['cc@example.com'],
      bcc: ['bcc@example.com'],
      subject: 'Verification code',
      text: '123456',
      html: '<strong>123456</strong>',
    },
  );
});

test('falls back to envelope recipients when To is absent', () => {
  assert.deepEqual(
    toAgentMailPayload({ subject: 'Hello', text: 'Body' }, ['user@example.com']),
    { to: ['user@example.com'], subject: 'Hello', text: 'Body' },
  );
});

test('idempotency key is stable for equivalent metadata', () => {
  const message = { messageId: '<1@example.com>', subject: 'Hello', text: '123456' };
  assert.equal(
    idempotencyKey(message, ['b@example.com', 'a@example.com']),
    idempotencyKey(message, ['a@example.com', 'b@example.com']),
  );
});

test('idempotency key changes when the verification code changes', () => {
  assert.notEqual(
    idempotencyKey({ subject: 'Code', text: '123456' }, ['user@example.com']),
    idempotencyKey({ subject: 'Code', text: '654321' }, ['user@example.com']),
  );
});
