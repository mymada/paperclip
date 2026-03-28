## 2024-05-20 - [Predictable PRNG in SQL tags]
**Vulnerability:** Use of predictable `Math.random()` to generate tags for PostgreSQL dollar-quoted strings during backups.
**Learning:** This repo builds database backup SQL scripts and needs secure ways to escape user input. Using `Math.random()` could theoretically allow an attacker to brute force the tag and inject malicious SQL commands if they control the content being backed up.
**Prevention:** Always use cryptographically secure random number generators like `node:crypto` `randomBytes()` when generating tokens, identifiers, or tags that need to be unpredictable for security boundaries.
