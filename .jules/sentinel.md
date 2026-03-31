## 2024-05-24 - XSS via Mermaid SVG Rendering

**Vulnerability:** The UI component `MarkdownBody.tsx` uses `dangerouslySetInnerHTML` to render SVG strings produced by the `mermaid` library. While Mermaid has a `securityLevel: "strict"` setting, relying solely on it to output completely safe SVG code can be a vector for Cross-Site Scripting (XSS), as SVGs can embed scripts and arbitrary HTML.

**Learning:** When passing dynamically generated SVG content into the DOM using `dangerouslySetInnerHTML`, the frontend must apply explicit sanitization even if the generating library claims strict security, ensuring defense in depth.

**Prevention:** Always sanitize SVG strings using a trusted HTML sanitizer before injecting them. Specifically for SVGs, configure `DOMPurify` using the SVG profile: `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })`. This strips malicious tags and attributes while preserving the valid SVG structure.

## 2024-05-20 - [Predictable PRNG in SQL tags]

**Vulnerability:** Use of predictable `Math.random()` to generate tags for PostgreSQL dollar-quoted strings during backups.
**Learning:** This repo builds database backup SQL scripts and needs secure ways to escape user input. Using `Math.random()` could theoretically allow an attacker to brute force the tag and inject malicious SQL commands if they control the content being backed up.
**Prevention:** Always use cryptographically secure random number generators like `node:crypto` `randomBytes()` when generating tokens, identifiers, or tags that need to be unpredictable for security boundaries.
