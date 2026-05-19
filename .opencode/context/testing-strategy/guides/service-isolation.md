<!-- Context: testing/service-isolation | Priority: critical | Version: 1.0 | Updated: 2026-03-06 -->

# Service Isolation (Multi-Project)

**Doel**: Veilig testen in multi-project omgeving

---

## Critical Rule

```
REGEL: Ken je project → Ken je poorten → Kill alleen jouw services

VERBODEN: Global kills die andere projecten beïnvloeden
```

---

## Service Registry

Elk project registreert actieve services:

```bash
# Locatie: .tmp/services/{project-name}/registry.json
{
  "project": "prompt-manager",
  "services": [
    {
      "name": "dev-server",
      "type": "sveltekit",
      "port": 45678,
      "started": "2026-03-03T10:00:00Z"
    }
  ]
}
```

---

## Safe Operations

| Actie          | ✅ Correct                     | ❌ Verboden       |
| -------------- | ------------------------------ | ----------------- |
| Server starten | `npm run dev` → noteer port    | Zonder registry   |
| Server stoppen | `lsof -ti:45678 \| xargs kill` | `killall node`    |
| Port checken   | `lsof -i :45678`               | Aannemen dat vrij |
| Cleanup        | Alleen eigen project           | `pkill -f "vite"` |

---

## Playwright Isolation

Playwright is **stateless** - geen conflicts tussen projecten. Maar dev servers moeten geïsoleerd:

| Resource           | Gedrag                  | Isolatie             |
| ------------------ | ----------------------- | -------------------- |
| Playwright Browser | Nieuwe instance per run | ✅ Geen actie        |
| Browser Context    | Geïsoleerd per test     | ✅ Geen actie        |
| Dev Server         | Specifieke poort        | ❌ Handmatig beheren |

---

## Safe Kill Procedure

```bash
# ✅ CORRECT - Project-specifieke kill
kill_project_service() {
  local project=$1
  local service_name=$2
  local registry=".tmp/services/${project}/registry.json"

  if [ -f "$registry" ]; then
    local port=$(jq -r ".services[] | select(.name == \"$service_name\") | .port" "$registry")
    if [ -n "$port" ]; then
      lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
  fi
}

# ❌ NOOIT DOEN
killall node           # VERBODEN - killt ALLE projecten
pkill -f "vite"        # VERBODEN - killt ALLE vite servers
```

---

## Dev Server Workflow

```bash
# Stap 1: Start en registreer
bun run dev
echo '{"project":"prompt-manager","services":[{"name":"dev-server","port":45678}]}' > .tmp/services/prompt-manager/registry.json

# Stap 2: Run tests
bun run test:e2e

# Stap 3: Stop ALLEEN jouw server
lsof -ti:45678 | xargs kill -9
```

---

## Related

- `testing/fases.md` - Testing phases
- `testing/test-templates.md` - Test templates
