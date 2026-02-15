<!-- Context: svelte/guides | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Guide: Form Handling

**Purpose**: Form actions, validation, progressive enhancement.
**Last Updated**: 2026-02-12

---

## Core Concept

Use server actions for mutations, Zod for validation, and progressive enhancement with `use:enhance`.

---

## Server Action Pattern

```ts
// +page.server.ts
import { fail } from '@sveltejs/kit';
import { z } from 'zod';

const schema = z.object({
	email: z.string().email('Invalid email'),
	password: z.string().min(8, 'Min 8 characters')
});

export const actions = {
	login: async ({ request }) => {
		const formData = await request.formData();
		const parsed = schema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, {
				errors: parsed.error.flatten().fieldErrors,
				values: Object.fromEntries(formData)
			});
		}

		// Process login
		return { success: true };
	}
};
```

---

## Form Component

```svelte
<script>
	import { enhance } from '$app/forms';

	let { form, data } = $props();
</script>

<form method="POST" action="?/login" use:enhance>
	<input
		name="email"
		type="email"
		value={form?.values?.email ?? ''}
		class={form?.errors?.email && 'border-red-500'}
	/>
	{#if form?.errors?.email}
		<p class="text-red-500">{form.errors.email[0]}</p>
	{/if}

	<input name="password" type="password" />

	<button type="submit">Login</button>
</form>
```

---

## Progressive Enhancement

```svelte
<script>
	import { enhance } from '$app/forms';

	let loading = $state(false);

	function handleSubmit({ cancel, formElement }) {
		loading = true;

		return async ({ result, update }) => {
			loading = false;
			await update({ reset: false }); // Keep form data
		};
	}
</script>

<form method="POST" use:enhance={handleSubmit}>
	<button type="submit" disabled={loading}>
		{loading ? 'Saving...' : 'Save'}
	</button>
</form>
```

---

## Key Points

- Always use `method="POST"` for mutations
- Validate with Zod on server
- Return `fail(400, { errors, values })` for validation errors
- Use `use:enhance` for progressive enhancement
- Access form data via `$props().form`

---

## Reference

- Official: https://svelte.dev/docs/kit/form-actions
- Related: [remote-functions.md](remote-functions.md)
