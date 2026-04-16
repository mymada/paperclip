## 2024-04-03 - Icon-only buttons lack ARIA labels
**Learning:** Found an accessibility issue pattern specific to this app's components. Developers often use the custom `size="icon-xs"` and `size="icon-sm"` variants on `<Button>` components to create icon-only buttons, but frequently forget to add the required `aria-label` attribute. This renders these buttons inaccessible to screen readers, which won't know how to describe the icon.
**Action:** Always verify that an `aria-label` is present whenever `<Button>` is used with `size="icon-xs"` or `size="icon-sm"` without any textual children.
## 2024-04-16 - Icon Button Accessibility
 **Learning:** Icon-only buttons (like those using `size="icon-xs"`) frequently lack `aria-label` attributes across the application, especially in complex components like `AgentDetail.tsx`. While they may sometimes have a `title` attribute which provides a tooltip, relying solely on `title` is insufficient for robust screen reader support.
 **Action:** Proactively scan for `<Button size="icon...">` components without `aria-label` attributes and ensure they are explicitly labeled to improve overall application accessibility.
