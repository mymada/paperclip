## 2024-04-03 - Icon-only buttons lack ARIA labels
**Learning:** Found an accessibility issue pattern specific to this app's components. Developers often use the custom `size="icon-xs"` and `size="icon-sm"` variants on `<Button>` components to create icon-only buttons, but frequently forget to add the required `aria-label` attribute. This renders these buttons inaccessible to screen readers, which won't know how to describe the icon.
**Action:** Always verify that an `aria-label` is present whenever `<Button>` is used with `size="icon-xs"` or `size="icon-sm"` without any textual children.
## 2024-05-19 - Missing ARIA labels in AgentDetail.tsx and BoardChat.tsx
**Learning:** Found multiple instances where `<Button size="icon" />` and `<Button size="icon-xs" />` were lacking `aria-label`s, causing the buttons to be inaccessible to screen reader users because they just contain icons.
**Action:** Always verify that `<Button>` variants containing only icons have an `aria-label` to provide an accessible description.
