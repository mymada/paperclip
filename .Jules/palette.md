## 2024-04-03 - Icon-only buttons lack ARIA labels
**Learning:** Found an accessibility issue pattern specific to this app's components. Developers often use the custom `size="icon-xs"` and `size="icon-sm"` variants on `<Button>` components to create icon-only buttons, but frequently forget to add the required `aria-label` attribute. This renders these buttons inaccessible to screen readers, which won't know how to describe the icon.
**Action:** Always verify that an `aria-label` is present whenever `<Button>` is used with `size="icon-xs"` or `size="icon-sm"` without any textual children.
