## 2026-03-29 - [⚡ Bulk Insert Document Revisions]
**Learning:** Avoid N+1 database queries inside loops. Accumulate the values and use a single `.values(array)` insert with Drizzle ORM to improve performance.
**Action:** When iterating over a list to insert items, prefer pushing them into an array to be inserted outside the loop over making iterative `await tx.insert` calls.

## 2026-03-29 - [🤝 Conflict Prevention & Collaboration]
**Learning:** Frequent and large-scale changes without synchronization with the `dev` branch lead to difficult-to-resolve merge conflicts. This slows down the integration process and risks regressions.
**Action:** Before starting any work, always execute `git fetch` and ensure your base branch is up-to-date with `dev`. Favor surgical, localized changes over global refactoring unless explicitly requested. Avoid modifying files unrelated to the task at hand to minimize "merge noise."

## 2024-03-29 - Unblocking the Event Loop with Async FS Reads

**Learning:** Synchronous file system operations (`fs.readFileSync`) in Express route handlers block the Node.js event loop, preventing concurrent requests from being processed until the read completes. This drastically impacts throughput, even for relatively small files. Replacing these with `fs.promises.readFile` allows the event loop to yield and process other events or promises.
**Action:** Always verify that route handlers interacting with the file system use asynchronous functions (e.g., `fs.promises.readFile`, `fs.promises.readdir`) to ensure maximum concurrency and server responsiveness.
## 2023-10-27 - Drizzle Conditional Aggregation Gotcha
**Learning:** When combining multiple COUNT queries into a single query using conditional aggregations (e.g., `SUM(CASE WHEN...)`) with Drizzle ORM, be extremely careful not to accidentally remove filtering conditions from the base `.where()` clause. Pushing conditions entirely into the `SELECT` projection forces the database to scan and `LEFT JOIN` every historical record instead of just the active ones, causing a severe performance regression.
**Action:** Keep common filtering conditions in the base `.where()` clause. Only use conditional aggregation in the `SELECT` for variables that require *different* conditions than the base set.
