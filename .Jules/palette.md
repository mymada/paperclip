## 2024-04-03 - Icon-only buttons lack ARIA labels
**Learning:** Found an accessibility issue pattern specific to this app's components. Developers often use the custom `size="icon-xs"` and `size="icon-sm"` variants on `<Button>` components to create icon-only buttons, but frequently forget to add the required `aria-label` attribute. This renders these buttons inaccessible to screen readers, which won't know how to describe the icon.
**Action:** Always verify that an `aria-label` is present whenever `<Button>` is used with `size="icon-xs"` or `size="icon-sm"` without any textual children.

## 2024-04-11 - Asynchronous Button Loading States
**Learning:** Found a common pattern where buttons triggering asynchronous actions (like sending messages in `BoardChat`) use a `disabled` state but lack a visual loading indicator (like a spinner). This leaves the user without clear feedback that their action is actively being processed, which can lead to confusion or repeated clicks.
**Action:** Always verify that buttons triggering async actions conditionally render a loading spinner (e.g., `<Loader2 className="animate-spin" />`) while processing, in addition to being disabled.
