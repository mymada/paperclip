## 2024-03-29 - Unblocking the Event Loop with Async FS Reads

**Learning:** Synchronous file system operations (`fs.readFileSync`) in Express route handlers block the Node.js event loop, preventing concurrent requests from being processed until the read completes. This drastically impacts throughput, even for relatively small files. Replacing these with `fs.promises.readFile` allows the event loop to yield and process other events or promises.
**Action:** Always verify that route handlers interacting with the file system use asynchronous functions (e.g., `fs.promises.readFile`, `fs.promises.readdir`) to ensure maximum concurrency and server responsiveness.
