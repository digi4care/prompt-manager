<!-- Context: development/security/auth/patterns | Priority: critical | Version: 2.0 | Updated: 2026-03-06 -->

# Auth Patterns

**Kern**: Cookie-based auth voor SvelteKit. **NOOIT localStorage voor tokens.**

---

## Quick Routes

| Wat je wilt          | Path                           |
| -------------------- | ------------------------------ |
| Cookies configureren | `cookie-setup.md`              |
| Routes beschermen    | `protected-routes.md`          |
| CSRF protectie       | `csrf-protection.md`           |
| Anti-patterns        | `better-auth-anti-patterns.md` |

---

## Core Principle

```
Auth tokens → HttpOnly cookies (XSS-safe)
UI state   → localStorage (theme, preferences, sidebar)
```

---

## Quick Reference

| Data             | Storage         | Why            |
| ---------------- | --------------- | -------------- |
| Session token    | HttpOnly cookie | XSS protection |
| User ID          | HttpOnly cookie | XSS protection |
| Theme preference | localStorage    | UI state       |
| Sidebar state    | localStorage    | UI state       |

---

## Actor Matrix

| Actor    | Cookie          | Login          | Landing      |
| -------- | --------------- | -------------- | ------------ |
| Customer | `session_id`    | `/login`       | `/dashboard` |
| Admin    | `admin_session` | `/admin/login` | `/admin`     |
| System   | API Key         | N/A            | N/A          |

---

## Related

- `cookie-setup.md` - Cookie configuration
- `protected-routes.md` - Route protection patterns
- `csrf-protection.md` - CSRF protection
- `better-auth-anti-patterns.md` - Better Auth pitfalls
