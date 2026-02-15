<!-- Context: development/lookup | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Checklist: Frontend QA

**Purpose**: After ANY frontend change, ALWAYS verify in browser.
**Audience**: Developers, AI agents

---

## Browser Check

- [ ] Open in real browser (not just read code)
- [ ] Check visually for layout issues
- [ ] Test interactions (click, type, scroll)
- [ ] Test responsive (mobile/tablet/desktop)

---

## Console Check

- [ ] Open DevTools → Console
- [ ] No red errors
- [ ] No unexpected warnings
- [ ] Network tab shows successful requests

---

## Functional Check

- [ ] Happy path works end-to-end
- [ ] Error states display correctly
- [ ] Loading states show when expected

---

## Common Issues

| Issue                   | Where to See      | Fix                 |
| ----------------------- | ----------------- | ------------------- |
| JavaScript error        | Console (red)     | Fix the error       |
| 404 resource            | Console / Network | Fix path            |
| CSS not applied         | Elements panel    | Check class names   |
| Component not rendering | Console / DOM     | Check props/state   |
| API failing             | Network tab       | Check endpoint/auth |

---

## Reference

- Related: `development/lookup/quality-gates.md`
