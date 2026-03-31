# ERPNext Plugin Native Integration Design

> **Status:** Approved
> **Date:** 2026-03-29
> **Topic:** Enhancing the ERPNext plugin to feel and behave like a native Paperclip component through UI refactoring, comment annotations, and bidirectional interactivity.

## 1. Goal
Transform the ERPNext plugin from a functional but visually isolated extension into a seamless, "native-feel" part of the Paperclip application. This involves deep UI alignment, contextual intelligence, and interactive workflows.

## 2. UI Refactoring (Native Aesthetics)
Current UI uses isolated inline styles and fixed widths. The new UI will strictly follow Paperclip's design tokens and responsive patterns.

### Changes
- **Styling:** Replace all `const styles = { ... }` with **Tailwind CSS** classes (e.g., `text-foreground`, `bg-card`, `border-border`).
- **Theming:** Use CSS variables from the host (`--color-text`, `--color-border`) to support dark/light modes and custom branding natively.
- **Responsiveness:** Remove hardcoded `maxWidth` and `minWidth`. Use flexible grid/flexbox layouts.
- **Components:** Re-implement `StatRow`, `Badge`, and `Table` to match the Paperclip `ui/src/components` exactly (using standard spacing, typography, and hover states).

## 3. Smart Annotations (Contextual Intelligence)
Enable the plugin to "understand" and augment conversations within Paperclip.

### Implementation
- **New Slot:** Register `commentAnnotation` in the plugin manifest.
- **Regex Detection:** Implement logic to detect ERPNext document patterns (e.g., `SINV-[0-9]+`, `SO-[0-9-]+`) in issue comments.
- **Annotation UI:** Render a status badge below comments containing these IDs.
  - **Example:** `SINV-00001 : Paid` with a green indicator and a direct link to the ERPNext instance.
  - **Data Flow:** Use `usePluginData("get-doc-summary", { id })` to fetch real-time status for detected IDs.

## 4. Bidirectional Interactivity (Actions)
Move from a read-only UI to an interactive control plane for ERP operations.

### Features
- **Sync Action:** Add a "Synchronize Now" button in the dashboard widget and the main ERPNext page.
- **Bridge Logic:** 
  - **UI:** Use `usePluginAction("trigger-sync")`.
  - **Worker:** Implement the `performAction` handler to trigger an immediate job run (`JOB_KEYS.fullSync`).
- **Links:** Add "Open in ERPNext" buttons to all document detail views (Page, Issue Tab, Project Tab).

## 5. Sidebar & Navigation
- **Sidebar Badge:** Implement a real-time badge on the ERPNext sidebar item showing the count of critical alerts (e.g., negative stock, pending approvals) using `usePluginStream`.

## 6. Testing & Verification
- **Visual Audit:** Side-by-side comparison of the ERPNext page vs. native pages (e.g., Issues, Projects) for pixel-perfect alignment.
- **Theming Test:** Verify visibility and contrast in both Light and Dark modes.
- **Annotation Test:** Post comments with various ERP document IDs and verify the badges appear with correct data.
- **Action Test:** Trigger a sync and verify the "Last Sync" timestamp updates immediately.

---
**Next Step:** Transition to the `writing-plans` skill to create a task-by-task implementation plan.
