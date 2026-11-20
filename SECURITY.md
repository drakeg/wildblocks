# Wildblocks security policy

Report potential account compromise, unauthorized world access, server input validation issues, data loss, or insecure distribution privately before public disclosure. Use GitHub private vulnerability reporting if enabled; otherwise establish a private channel with the maintainer. Do not post credentials, personal world files, exploit details or secret configuration in public issues.

The most recent published release and the current default branch are the supported targets for security fixes; historical versions receive no guaranteed backports. The release workflow runs `npm audit --audit-level=high`, but passing it does not prove the game has no vulnerabilities. Do not disable security checks to accommodate a dependency update.

Self-hosted dedicated servers should use access control, secure administrator credentials, backups, and restricted network exposure. Use TLS/reverse proxy protections for any internet-exposed deployment as described in [SERVER.md](SERVER.md). Client builds for macOS are not notarized and Windows builds may be unsigned; see [RELEASES.md](RELEASES.md).
