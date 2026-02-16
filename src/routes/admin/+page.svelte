<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';

	export let data: PageData;
	let { orgs } = data;

	// Reactive update for orgs when data changes (e.g. after form submission)
	$: orgs = data.orgs;
</script>

<div class="p-4">
	<h1 class="mb-4 text-2xl font-bold">Admin Dashboard</h1>

	<div class="mb-8 rounded border bg-gray-50 p-4">
		<h2 class="mb-2 text-xl font-semibold">Create New Organization</h2>
		<form method="POST" action="?/createOrg" use:enhance class="flex flex-col gap-2">
			<div class="flex gap-2">
				<input
					type="text"
					name="id"
					placeholder="Organization ID"
					class="w-1/3 rounded border p-2"
					required
				/>
				<input
					type="text"
					name="name"
					placeholder="Organization Name"
					class="flex-grow rounded border p-2"
					required
				/>
				<Button type="submit" variant="default">
					Create
				</Button>
			</div>
			<p class="text-xs text-gray-500">
				Note: The Organization ID must match the ID issued by the Mobili platform.
			</p>
		</form>
	</div>

	<div class="space-y-4">
		<h2 class="text-xl font-semibold">Organizations</h2>
		{#if orgs.length === 0}
			<p>No organizations found.</p>
		{:else}
			{#each orgs as org (org.id)}
				<div class="rounded border bg-white p-4 shadow-sm">
					<div class="mb-4 flex items-center justify-between">
						<form
							method="POST"
							action="?/updateOrgName"
							use:enhance
							class="mr-4 flex flex-grow items-center gap-2"
						>
							<input type="hidden" name="id" value={org.id} />
							<div class="mr-2 font-mono text-gray-600">{org.id}</div>
							<input
								type="text"
								name="name"
								value={org.name}
								class="flex-grow rounded border p-2 font-semibold"
							/>
							<Button
								type="submit"
								variant="secondary"
								size="sm"
							>
								Update Name
							</Button>
						</form>

						<form
							method="POST"
							action="?/deleteOrg"
							use:enhance={({ cancel }) => {
								if (!confirm('Are you sure you want to delete this organization?')) {
									cancel();
								}
								return async ({ update }) => {
									await update();
								};
							}}
						>
							<input type="hidden" name="id" value={org.id} />
							<Button
								type="submit"
								variant="destructive"
								size="sm"
							>
								Delete
							</Button>
						</form>
					</div>

					<div class="mt-4 border-t pt-4">
						<h3 class="mb-2 font-medium">Add User to Organization</h3>
						<form method="POST" action="?/addUserToOrg" use:enhance class="flex gap-2">
							<input type="hidden" name="orgId" value={org.id} />
							<input
								type="email"
								name="email"
								placeholder="User Email"
								class="flex-grow rounded border p-2"
								required
							/>
							<Button
								type="submit"
								variant="default"
								size="sm"
							>
								Add User
							</Button>
						</form>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
