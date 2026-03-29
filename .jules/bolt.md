## 2026-03-29 - [⚡ Bulk Insert Document Revisions]
**Learning:** Avoid N+1 database queries inside loops. Accumulate the values and use a single `.values(array)` insert with Drizzle ORM to improve performance.
**Action:** When iterating over a list to insert items, prefer pushing them into an array to be inserted outside the loop over making iterative `await tx.insert` calls.