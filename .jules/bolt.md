## 2026-03-29 - [⚡ Bulk Insert Document Revisions]
**Learning:** Avoid N+1 database queries inside loops. Accumulate the values and use a single `.values(array)` insert with Drizzle ORM to improve performance.
**Action:** When iterating over a list to insert items, prefer pushing them into an array to be inserted outside the loop over making iterative `await tx.insert` calls.

## 2026-03-29 - [🤝 Conflict Prevention & Collaboration]
**Learning:** Frequent and large-scale changes without synchronization with the `dev` branch lead to difficult-to-resolve merge conflicts. This slows down the integration process and risks regressions.
**Action:** Before starting any work, always execute `git fetch` and ensure your base branch is up-to-date with `dev`. Favor surgical, localized changes over global refactoring unless explicitly requested. Avoid modifying files unrelated to the task at hand to minimize "merge noise."

## 2024-03-29 - Unblocking the Event Loop with Async FS Reads

**Learning:** Synchronous file system operations (`fs.readFileSync`) in Express route handlers block the Node.js event loop, preventing concurrent requests from being processed until the read completes. This drastically impacts throughput, even for relatively small files. Replacing these with `fs.promises.readFile` allows the event loop to yield and process other events or promises.
**Action:** Always verify that route handlers interacting with the file system use asynchronous functions (e.g., `fs.promises.readFile`, `fs.promises.readdir`) to ensure maximum concurrency and server responsiveness.

## 2026-04-08 - Combining COUNT queries with missing WHERE clause filters causes performance regressions
**Learning:** When combining multiple COUNT queries into a single query using conditional aggregations (`SUM(CASE WHEN ...)`), it's critical to preserve the `WHERE` clauses from the original separate queries. Removing filters like `status = 'open'` causes the database to perform full table scans over potentially thousands of historical rows, introducing severe performance regressions despite reducing database round-trips.
**Action:** When performing conditional aggregation, always identify the common set of `WHERE` filters that all original queries shared, and apply those filters to the base `.where()` clause of the new combined query to ensure the query scope remains bounded.
