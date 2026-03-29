## 2024-05-24 - XSS via Mermaid SVG Rendering

**Vulnerability:** The UI component `MarkdownBody.tsx` uses `dangerouslySetInnerHTML` to render SVG strings produced by the `mermaid` library. While Mermaid has a `securityLevel: "strict"` setting, relying solely on it to output completely safe SVG code can be a vector for Cross-Site Scripting (XSS), as SVGs can embed scripts and arbitrary HTML.

**Learning:** When passing dynamically generated SVG content into the DOM using `dangerouslySetInnerHTML`, the frontend must apply explicit sanitization even if the generating library claims strict security, ensuring defense in depth.

**Prevention:** Always sanitize SVG strings using a trusted HTML sanitizer before injecting them. Specifically for SVGs, configure `DOMPurify` using the SVG profile: `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })`. This strips malicious tags and attributes while preserving the valid SVG structure.
