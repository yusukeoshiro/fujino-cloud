<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let inviteEmail = $state('');
	let isInviting = $state(false);
</script>

<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
	<div class="border-b border-slate-100 px-6 py-4">
		<h2 class="text-lg font-medium text-slate-900">メンバー管理</h2>
		<p class="text-sm text-slate-500">
			この組織に所属するメンバーを管理します。追加したいユーザーのメールアドレスを入力して招待してください。
		</p>
	</div>

	<div class="space-y-6 px-6 py-6">
		<!-- Invite Form -->
		<div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
			<h3 class="mb-2 text-sm font-semibold">メンバーを招待</h3>
			<form
				method="POST"
				action="?/invite"
				use:enhance={() => {
					isInviting = true;
					return async ({ update, result }) => {
						await update();
						isInviting = false;
						if (result.type === 'success') {
							inviteEmail = '';
						}
					};
				}}
				class="flex flex-col gap-2 sm:flex-row sm:items-start"
			>
				<div class="w-full flex-grow">
					<input
						type="email"
						name="email"
						placeholder="user@example.com"
						bind:value={inviteEmail}
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						required
					/>
					{#if form?.notFound}
						<p class="mt-1 text-xs text-red-600">ユーザーが見つかりません。</p>
					{:else if form?.alreadyExists}
						<p class="mt-1 text-xs text-red-600">このユーザーは既にメンバーです。</p>
					{:else if form?.error}
						<p class="mt-1 text-xs text-red-600">{form.error}</p>
					{/if}
				</div>
				<button
					type="submit"
					disabled={isInviting}
					class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
				>
					{isInviting ? '招待中...' : '招待'}
				</button>
			</form>
		</div>

		<!-- Member List -->
		<div class="ring-opacity-5 overflow-hidden rounded-lg shadow ring-1 ring-black">
			<table class="min-w-full divide-y divide-gray-300 bg-white">
				<thead class="bg-gray-50">
					<tr>
						<th
							scope="col"
							class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
							>名前</th
						>
						<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
							>メールアドレス</th
						>
						<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
							>権限</th
						>
						<th scope="col" class="relative py-3.5 pr-4 pl-3 sm:pr-6">
							<span class="sr-only">操作</span>
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each data.members || [] as member (member.id)}
						<tr>
							<td
								class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6"
							>
								<div class="flex items-center">
									{#if member.photoURL}
										<img class="mr-3 h-8 w-8 rounded-full" src={member.photoURL} alt="" />
									{:else}
										<div
											class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500"
										>
											{(member.name || '?').charAt(0).toUpperCase()}
										</div>
									{/if}
									{member.name}
								</div>
							</td>
							<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500"
								>{member.email ?? 'Unknown'}</td
							>
							<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">admin</td>
							<td
								class="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6"
							>
								{#if member.userId !== data.user?.uid}
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="memberId" value={member.id} />
										<button
											type="submit"
											class="text-xs font-semibold text-red-600 hover:text-red-900">削除</button
										>
									</form>
								{:else}
									<span
										class="cursor-not-allowed text-xs text-gray-400"
										title="自分自身は削除できません">削除</span
									>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if form?.cannotDeleteSelf}
			<div class="mt-4 rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg
							class="h-5 w-5 text-red-400"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">操作エラー</h3>
						<div class="mt-2 text-sm text-red-700">
							<p>自分自身を組織から削除することはできません。</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
