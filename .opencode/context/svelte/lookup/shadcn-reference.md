<!-- Context: svelte/lookup | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Lookup: shadcn-svelte Components

**Purpose**: Quick reference for available shadcn components.
**Last Updated**: 2026-02-12

---

## Import Pattern

```svelte
<script>
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
</script>
```

---

## Layout

| Component    | Usage                            |
| ------------ | -------------------------------- |
| `Card`       | Container with border and shadow |
| `Separator`  | Horizontal/vertical divider      |
| `ScrollArea` | Scrollable container             |
| `Sheet`      | Side panel/drawer                |
| `Sidebar`    | Navigation sidebar               |

```svelte
<Card>
	<CardHeader>
		<CardTitle>Title</CardTitle>
		<CardDescription>Description</CardDescription>
	</CardHeader>
	<CardContent>Content</CardContent>
	<CardFooter>Footer</CardFooter>
</Card>
```

---

## Forms

| Component  | Usage                        |
| ---------- | ---------------------------- |
| `Button`   | Click actions                |
| `Input`    | Text input                   |
| `Textarea` | Multi-line input             |
| `Select`   | Dropdown selection           |
| `Checkbox` | Boolean input                |
| `Switch`   | Toggle                       |
| `Form`     | Form wrapper with validation |

```svelte
<Button variant="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
```

---

## Feedback

| Component     | Usage               |
| ------------- | ------------------- |
| `Dialog`      | Modal dialog        |
| `AlertDialog` | Confirmation dialog |
| `Toast`       | Notification        |
| `Progress`    | Loading progress    |
| `Skeleton`    | Loading placeholder |

```svelte
<Dialog>
	<DialogTrigger>Open</DialogTrigger>
	<DialogContent>
		<DialogTitle>Title</DialogTitle>
		<DialogDescription>Content</DialogDescription>
	</DialogContent>
</Dialog>
```

---

## Data Display

| Component   | Usage                |
| ----------- | -------------------- |
| `Table`     | Tabular data         |
| `Badge`     | Status/tag label     |
| `Avatar`    | User image           |
| `Tabs`      | Tabbed content       |
| `Accordion` | Collapsible sections |

---

## Common Variants

### Button

```svelte
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Badge

```svelte
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

---

## Reference

- Docs: https://www.shadcn-svelte.com/docs/components
- Related: [design-tokens.md](design-tokens.md)
