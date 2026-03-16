---
name: email
description: "Send, receive, search, and manage email via AgenticMail on CEG. Use when asked to check inbox, send a message, compose a draft, search mail, or interact with the Zuberi inbox. Also activates for email troubleshooting: 'are you having trouble sending emails,' 'is email working,' 'can you email me,' 'did my email go through,' 'why didn't I get a reply,' or checking AgenticMail health on CEG:3100. NOT for n8n email notifications (use n8n skill)."
---

# Email — AgenticMail

> **IMPORTANT:** Always use the exact endpoint paths documented in this file.
> Do not construct paths from memory or convention. The AgenticMail API
> does not follow REST conventions — wrong paths return 404 with no useful error.
> Read this file before every email operation.

Send, receive, and manage email through the self-hosted AgenticMail instance on CEG.
Agent account: **Zuberi** (zuberi@localhost, relayed via zuberiwaweru@gmail.com).

## When to use

- User asks to check inbox, read email, or see new messages
- User asks to send an email or reply to one
- User asks to search past emails
- User asks about drafts, contacts, templates, or scheduled sends
- User asks to forward, archive, trash, or delete email

## Authentication

All requests require the agent API key in the Authorization header:

```
Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a
```

Base URL: `http://100.100.101.1:3100/api/agenticmail`

## Core Commands

### Check inbox
```bash
curl -s -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/mail/inbox"
```

### Read a specific message (by UID)
```bash
curl -s -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/mail/messages/UID"
```

### Send an email
```bash
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  -H "Content-Type: application/json" \
  "http://100.100.101.1:3100/api/agenticmail/mail/send" \
  -d '{"to":"recipient@example.com","subject":"Subject","text":"Body text","html":"<p>Optional HTML body</p>"}'
```

### Search email
```bash
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  -H "Content-Type: application/json" \
  "http://100.100.101.1:3100/api/agenticmail/mail/search" \
  -d '{"query":"search terms"}'
```

### Mark as read
```bash
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/mail/messages/UID/seen"
```

### Delete a message
```bash
curl -s -X DELETE -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/mail/messages/UID"
```

### Move a message to a folder
```bash
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  -H "Content-Type: application/json" \
  "http://100.100.101.1:3100/api/agenticmail/mail/messages/UID/move" \
  -d '{"folder":"Archive"}'
```

## Organization

### List folders
```bash
curl -s -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/mail/folders"
```

### List contacts
```bash
curl -s -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/contacts"
```

### Drafts — list / create / send
```bash
# List drafts:
curl -s -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/drafts"

# Create a draft:
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  -H "Content-Type: application/json" \
  "http://100.100.101.1:3100/api/agenticmail/drafts" \
  -d '{"to":"recipient@example.com","subject":"Subject","text":"Body"}'

# Send a draft (by draft ID):
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/drafts/DRAFT_ID/send"
```

### Daily digest
```bash
curl -s -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/mail/digest"
```

## Batch Operations

For multiple messages at once (token-efficient):

```bash
# Batch mark as read:
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  -H "Content-Type: application/json" \
  "http://100.100.101.1:3100/api/agenticmail/mail/batch/seen" \
  -d '{"uids":[1,2,3]}'

# Batch delete:
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  -H "Content-Type: application/json" \
  "http://100.100.101.1:3100/api/agenticmail/mail/batch/delete" \
  -d '{"uids":[1,2,3]}'

# Batch read (fetch multiple messages at once):
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  -H "Content-Type: application/json" \
  "http://100.100.101.1:3100/api/agenticmail/mail/batch/read" \
  -d '{"uids":[1,2,3]}'
```

## Security

### Spam scoring
```bash
curl -s -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/mail/messages/UID/spam-score"
```

### Pending review (blocked by PII scanner)
```bash
# List pending:
curl -s -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/mail/pending"

# Approve a pending message:
curl -s -X POST -H "Authorization: Bearer ak_3c9122baa10e168e7c3c950890892e593e041c6ea8349c6a" \
  "http://100.100.101.1:3100/api/agenticmail/mail/pending/PENDING_ID/approve"
```

## Health check
```bash
curl -s http://100.100.101.1:3100/api/agenticmail/health
```

## Important

- **Sending email requires CONFIRM** — always show the recipient, subject, and body to James before sending
- **Deleting email requires CONFIRM** — name what will be deleted
- Inbox check and search are read-only — proceed freely
- Outbound emails are scanned for PII/credentials — blocked messages go to pending review
- Relay mode: emails are sent as zuberiwaweru@gmail.com via Gmail SMTP
- AgenticMail runs as a systemd user service on CEG (`agenticmail.service`)
