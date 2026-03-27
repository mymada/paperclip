# Token Economics: Efficiency Rules

To minimize token consumption and operational costs, all agents MUST follow these strategies:

## 1. On-Demand Context Loading
- **No Massive Reads:** Do not read full memory files in every turn.
- **Search First:** Use `grep_search`, `glob`, or specialized memory tools to find specific information before reading.
- **Targeted Reading:** Use `read_file` with `start_line` and `end_line` to retrieve only the necessary snippets.

## 2. Communication & Reporting
- **KERNEL Anatomy:** Use the `# CONTEXT`, `# TASK`, `# CONSTRAINTS`, `# FORMAT` structure for all tasks.
- **Brevity by Default:** Every word costs money. If you can say it in 5 words, don't use 10.
- **Zero Narration:** Do not explain what you are about to do unless it's a high-impact shell command. Perform the task directly.
- **Result-Oriented:** Focus on the delta. What changed? What is the outcome?

## 3. Tool Optimization
- **Parallel Execution:** Group independent tool calls in a single turn whenever possible.
- **Combined Operations:** Identify multiple points of interest in one search turn.
- **Batch Shell Commands:** Use `&&` or `;` to run multiple shell commands in one call.

## 4. Smart Architecture
- **Keep Context Small:** Aim to keep active context window under 5K tokens for routine tasks.
- **Efficiency as a Requirement:** Treat token efficiency as a core technical constraint.