<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { AlertCircle } from 'lucide-svelte';
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card class="w-full max-w-md">
		<CardHeader class="space-y-1">
			<CardTitle class="flex items-center gap-2 text-2xl font-bold">
				<AlertCircle class="h-6 w-6 text-muted-foreground" />
				Registration Unavailable
			</CardTitle>
			<CardDescription>User registration is not available for this application.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<p class="text-sm text-muted-foreground">
				This is an admin-only application. If you need access, please contact the system
				administrator.
			</p>

			<div class="rounded-md bg-muted p-4">
				<h4 class="mb-2 text-sm font-medium">Already have an account?</h4>
				<Button onclick={() => goto('/login')} class="w-full">Go to Login</Button>
			</div>

			<div class="text-center">
				<Button variant="link" onclick={() => goto('/')} class="text-sm">Back to Home</Button>
			</div>
		</CardContent>
	</Card>
</div>
