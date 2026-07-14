# AgentMail SMTP Relay Design

## Goal

Allow New API email verification to work on Railway Free/Trial, where outbound
SMTP is disabled, without modifying New API itself or committing credentials.

## Architecture

New API connects over Railway private networking to a small SMTP service. The
relay authenticates the SMTP client, parses the message, validates the sender,
and calls AgentMail's HTTPS send-message API. The relay has no public SMTP
listener and stores all credentials in Railway environment variables.

```text
New API -- private SMTP :2525 --> AgentMail relay -- HTTPS --> AgentMail API
```

The relay also exposes an HTTP `/healthz` endpoint on Railway's `PORT` for
deployment health checks.

## Security

- SMTP authentication is mandatory.
- Relay credentials and the AgentMail API key are environment variables.
- The envelope sender must equal `AGENTMAIL_INBOX_ID`.
- Messages are limited to 2 MB and 50 recipients.
- AgentMail requests time out after 15 seconds.
- Logs contain delivery status only, never credentials or message bodies.
- An idempotency key derived from message metadata reduces duplicate delivery
  if a request is retried.

## Deployment

Deploy `apps/agentmail-relay/Dockerfile` as a separate Railway service in the
same project. Do not create a public domain for SMTP. Configure New API with:

```text
Host: agentmail-relay.railway.internal
Port: 2525
Encryption: none
Username: value of RELAY_USERNAME
Password: value of RELAY_PASSWORD
From: wboke-5247@agentmail.to
```

When Railway is upgraded to Pro or the application moves to a dedicated Hong
Kong server, New API can switch back to direct AgentMail SMTP without changing
the registration flow.

## Verification

1. Relay unit tests pass.
2. Docker image builds.
3. Railway health check returns HTTP 200.
4. New API `/api/verification` completes without timeout.
5. The test mailbox receives a verification code.
