# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of these channels:

### Option 1: Email

Send an email to: **security@strongdm.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Option 2: GitHub Security Advisories

Use GitHub's private vulnerability reporting:
1. Go to https://github.com/strongdm/cxdb/security/advisories
2. Click "Report a vulnerability"
3. Fill out the form with details

## Response Timeline

- **Acknowledgment**: Within 48 hours of report
- **Initial assessment**: Within 5 business days
- **Fix timeline**:
  - Critical vulnerabilities: 30 days
  - High vulnerabilities: 60 days
  - Medium/Low vulnerabilities: 90 days

## Disclosure Policy

We follow coordinated disclosure:

1. You report the vulnerability privately
2. We acknowledge and investigate
3. We develop and test a fix
4. We release the fix and publish a security advisory
5. You may publicly disclose after the fix is released (or after 90 days, whichever comes first)

## Security Best Practices

When deploying CXDB in production:

### TLS/Encryption

- **Always use TLS** for the binary protocol in production (port 9009)
- **Always use HTTPS** for the HTTP API and gateway
- Use valid certificates from a trusted CA (Let's Encrypt, etc.)
- Consider encryption at rest for sensitive conversation data

### Authentication

- **Enable OAuth** for the gateway (Google OAuth or custom OIDC provider)
- **Restrict allowed domains** (GOOGLE_ALLOWED_DOMAIN) to your organization
- **Use strong session secrets** (generate with `openssl rand -hex 32`)
- **Set appropriate session TTLs** (default 24 hours)

### Network Security

- **Firewall rules**: Only expose ports 9009 and 9010 to trusted clients
- **Network segmentation**: Run CXDB in a private network when possible
- **Use Kubernetes NetworkPolicies** to restrict pod-to-pod traffic

### Secret Management

- **Never commit secrets** to version control
- **Use environment variables** for configuration
- **Use Kubernetes Secrets** or external secret managers (Vault, AWS Secrets Manager)
- **Rotate credentials** regularly (session secrets, OAuth credentials)

### Content Security Policy (CSP)

- **Restrict renderer origins**: Set ALLOWED_RENDERER_ORIGINS to only trusted CDNs
- **Validate renderer code**: Review any custom renderers before deploying
- **Use Subresource Integrity (SRI)** for CDN-hosted renderers when possible

### Input Validation

- **Validate all client inputs** (context IDs, turn IDs, payload sizes)
- **Enforce size limits** on payloads to prevent DoS
- **Sanitize user-provided content** in the UI

### Access Controls

- **Implement least privilege**: Users should only access their own contexts
- **Audit access**: Log all context access for security monitoring
- **Consider multi-tenancy**: Isolate contexts between users/teams

### Dependency Management

- **Keep dependencies updated**: Run `cargo update`, `go get -u`, `pnpm update` regularly
- **Monitor security advisories**: Subscribe to GitHub Security Advisories
- **Run security audits**: Use `cargo audit`, `nancy`, `pnpm audit`

### Backup and Disaster Recovery

- **Regular backups**: Back up the `/data` directory frequently
- **Test restores**: Verify backups can be restored successfully
- **Offsite storage**: Store backups in a separate location

## Security Updates

Subscribe to security updates:
- Watch this repository on GitHub (Settings → Watch → Custom → Security alerts)
- Check the [Security Advisories](https://github.com/strongdm/cxdb/security/advisories) page

## Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities:

<!-- Security researchers will be listed here after coordinated disclosure -->

---

Thank you for helping keep CXDB and our users safe!
