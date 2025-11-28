<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	export let data: PageData;
	let { orgs } = data;

	// Reactive update for orgs when data changes (e.g. after form submission)
	$: orgs = data.orgs;
</script>

<div class="p-4">
	<h1 class="mb-4 text-2xl font-bold">Admin Dashboard</h1>

	<div class="mb-8 rounded border bg-gray-50 p-4">
		<h2 class="mb-2 text-xl font-semibold">Create New Organization</h2>
		<form method="POST" action="?/createOrg" use:enhance class="flex gap-2">
			<input
				type="text"
				name="name"
				placeholder="Organization Name"
				class="flex-grow rounded border p-2"
				required
			/>
			<button type="submit" class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
				Create
			</button>
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
							<input
								type="text"
								name="name"
								value={org.name}
								class="flex-grow rounded border p-2 font-semibold"
							/>
							<button
								type="submit"
								class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
							>
								Update Name
							</button>
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
							<button
								type="submit"
								class="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
							>
								Delete
							</button>
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
							<button
								type="submit"
								class="rounded bg-purple-500 px-3 py-1 text-sm text-white hover:bg-purple-600"
							>
								Add User
							</button>
						</form>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
