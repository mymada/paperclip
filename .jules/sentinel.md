## 2026-04-19 - Disabling Express X-Powered-By
**Vulnerability:** Express sends an X-Powered-By header by default, revealing the server framework to potential attackers.
**Learning:** Default framework configurations often prioritize convenience or marketing over security. It's a best practice to disable headers that leak stack information.
**Prevention:** In new Express apps, always call `app.disable('x-powered-by')` or use a middleware like `helmet` early in the setup phase.
