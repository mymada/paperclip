# The KERNEL Prompting Framework

All agents MUST follow the KERNEL framework to ensure deterministic, verifiable, and efficient results.

## The 6 Core Principles (KERNEL)

1. **K – Keep it simple:** Avoid context bloat. Provide clear, minimal background.
2. **E – Easy to verify:** Use concrete success criteria (e.g., "Output MUST be valid JSON", "Include 3 examples").
3. **R – Reproducible results:** Use specific requirements and fixed parameters. Avoid vague or temporal language.
4. **N – Narrow scope:** One interaction = One atomic goal. Do not bundle multiple complex tasks.
5. **E – Explicit constraints:** Explicitly state what NOT to do. Negative constraints reduce hallucination and waste.
6. **L – Logical structure:** Every prompt anatomy MUST follow these four sections:

---

## The Standard Anatomy

Every complex instruction or task assignment should be structured as follows:

### # CONTEXT
Clear and concise background. Who are you? What is the current state?
*Example: "You are a database optimization specialist. We are analyzing a slow query log from a PostgreSQL instance."*

### # TASK
The specific action to perform. Use action verbs.
*Example: "Identify the top 3 most expensive queries and suggest one index for each."*

### # CONSTRAINTS
The "Do Not" rules. Boundaries and limitations.
*Example:
- Do not suggest architectural changes.
- Only focus on read queries.
- Max 50 tokens per suggestion.*

### # FORMAT
The exact desired output structure.
*Example: "Return as a Markdown table with columns: Query, Cost, Suggested Index."*

---

## Implementation Rules
- **Chain, Don't Bundle:** If a task is complex, break it into KERNEL-compliant sub-tasks.
- **Self-Verification:** Before outputting, verify that all **CONSTRAINTS** were met.
- **Token Efficiency:** KERNEL naturally supports Token Economics by removing fluff.