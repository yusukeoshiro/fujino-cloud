<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let token = $state('');
	let requestedPath = $state('/_/orgs/d4ZtXDD8O5ZjqnI8XqX3/gps-conditioning/dashboard');
	let error = $state<string | null>(null);

	function validateForm() {
		if (!token.trim()) {
			error = 'Please enter a JWT token';
			return false;
		}
		error = null;
		return true;
	}
</script>

<div class="container mx-auto max-w-2xl p-8">
	<div class="rounded-lg border bg-card p-6 shadow-sm">
		<h1 class="mb-2 text-2xl font-bold">Canvas SSO Test Page</h1>
		<p class="mb-6 text-sm text-muted-foreground">
			Simulate the Canvas SSO login flow by entering a JWT token
		</p>

		<form
			method="POST"
			action="/api/auth/canvas"
			onsubmit={(e) => {
				if (!validateForm()) {
					e.preventDefault();
				}
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="token">JWT Token</Label>
				<textarea
					id="token"
					name="token"
					bind:value={token}
					placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
					rows={8}
					class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				></textarea>
				<p class="text-xs text-muted-foreground">Paste the full JWT token from Canvas</p>
			</div>

			<div class="space-y-2">
				<Label for="path">Requested Path (optional)</Label>
				<Input
					id="path"
					name="requested_path"
					bind:value={requestedPath}
					placeholder="/_/orgs/[orgId]/dashboard"
					class="font-mono text-sm"
				/>
				<p class="text-xs text-muted-foreground">The path to redirect to after authentication</p>
			</div>

			{#if error}
				<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
					<strong>Error:</strong>
					{error}
				</div>
			{/if}

			<Button type="submit" class="w-full">Test SSO Login</Button>
		</form>

		<div class="mt-6 rounded-md bg-muted p-4 text-xs">
			<h3 class="mb-2 font-semibold">How it works:</h3>
			<ol class="list-inside list-decimal space-y-1 text-muted-foreground">
				<li>Paste a valid JWT token from Canvas</li>
				<li>Optionally specify a redirect path</li>
				<li>Click "Test SSO Login"</li>
				<li>The system will verify the JWT, create/update the user, and redirect you</li>
			</ol>
		</div>
	</div>
</div>
