<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { deviceTokenAccessor } from '$lib/accessors/device-token.accessor';
	import { page } from '$app/state';

	let { data, form }: { data: PageData, form: ActionData } = $props();

	const orgId = page.params.oid;

	const deviceTokenReady = deviceTokenAccessor.ready;

	const applyToken = (token: string | null) => {
		deviceTokenAccessor.set(token ?? null);
	};

	let deviceLastUpdated = $state<string | null>(data.deviceTokenUpdatedAt ?? null);
	let deviceBanner = $state<{ text: string; tone: 'success' | 'error' } | null>(null);
	let tokenInput = $state<string>('');
	let isSavingDevice = $state(false);
	let isDeletingDevice = $state(false);

	let contentsProviderApiToken = $state({
		hasToken: data.contentsProviderApiToken?.hasToken ?? false,
		lastFour: data.contentsProviderApiToken?.lastFour ?? null,
		updatedAt: data.contentsProviderApiToken?.updatedAt ?? null,
	});
	let contentsProviderIssuedToken = $state<string | null>(null);
	let contentsProviderBanner = $state<{ text: string; tone: 'success' | 'error' } | null>(null);
	let isIssuingContentsProvider = $state(false);
	let isDeletingContentsProvider = $state(false);

	// Member Management State
	let inviteEmail = $state('');
	let isInviting = $state(false);
	let inviteBanner = $state<{ text: string; tone: 'success' | 'error' } | null>(null);
	// We can rely on SSR data for list, but if we wanted client-side updates we would need state.
	// Since we use form actions (SSR), the page data will update on successful navigation.

	applyToken(data.deviceToken ?? null);

	const ensureOrg = () => {
		if (!orgId) {
			throw new Error('組織IDが特定できませんでした。');
		}
	};

	const formatTimestamp = (value: string | null) =>
		value ? new Date(value).toLocaleString() : null;

	const saveDeviceToken = async (event: SubmitEvent) => {
		event.preventDefault();
		ensureOrg();
		const trimmed = tokenInput.trim();
		if (!trimmed) {
			deviceBanner = { text: 'トークンを入力してください。', tone: 'error' };
			return;
		}
		isSavingDevice = true;
		deviceBanner = null;
		try {
			const response = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/device-token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: trimmed }),
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message ?? 'トークンの保存に失敗しました。');
			}
			applyToken(trimmed);
			tokenInput = '';
			deviceLastUpdated = result.updatedAt ?? null;
			deviceBanner = {
				text: result.message ?? 'デバイストークンを保存しました。',
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			deviceBanner = {
				text: error instanceof Error ? error.message : 'トークンの保存に失敗しました。',
				tone: 'error',
			};
		} finally {
			isSavingDevice = false;
		}
	};

	const deleteDeviceToken = async () => {
		ensureOrg();
		isDeletingDevice = true;
		deviceBanner = null;
		try {
			const response = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/device-token`, {
				method: 'DELETE',
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message ?? 'トークンの削除に失敗しました。');
			}
			applyToken(null);
			tokenInput = '';
			deviceLastUpdated = null;
			deviceBanner = {
				text: result.message ?? 'デバイストークンを削除しました。',
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			deviceBanner = {
				text: error instanceof Error ? error.message : 'トークンの削除に失敗しました。',
				tone: 'error',
			};
		} finally {
			isDeletingDevice = false;
		}
	};

	const renewContentsProviderToken = async () => {
		ensureOrg();
		isIssuingContentsProvider = true;
		contentsProviderBanner = null;
		contentsProviderIssuedToken = null;
		try {
			const response = await fetch(
				`/api/orgs/${encodeURIComponent(orgId)}/contents-provider-api-token`,
				{
					method: 'POST',
				},
			);
			const result = await response.json();
			if (!response.ok || !result?.token) {
				throw new Error(result?.message ?? 'APIトークンの発行に失敗しました。');
			}

			contentsProviderApiToken = {
				hasToken: true,
				lastFour:
					result.lastFour ?? (typeof result.token === 'string' ? result.token.slice(-4) : null),
				updatedAt: result.updatedAt ?? null,
			};
			contentsProviderIssuedToken = result.token;
			contentsProviderBanner = {
				text: result.message ?? 'APIトークンを発行しました。',
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			contentsProviderBanner = {
				text: error instanceof Error ? error.message : 'APIトークンの発行に失敗しました。',
				tone: 'error',
			};
		} finally {
			isIssuingContentsProvider = false;
		}
	};

	const deleteContentsProviderToken = async () => {
		ensureOrg();
		isDeletingContentsProvider = true;
		contentsProviderBanner = null;
		try {
			const response = await fetch(
				`/api/orgs/${encodeURIComponent(orgId)}/contents-provider-api-token`,
				{
					method: 'DELETE',
				},
			);
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message ?? 'APIトークンの削除に失敗しました。');
			}
			contentsProviderApiToken = {
				hasToken: false,
				lastFour: null,
				updatedAt: null,
			};
			contentsProviderIssuedToken = null;
			contentsProviderBanner = {
				text: result.message ?? 'APIトークンを削除しました。',
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			contentsProviderBanner = {
				text: error instanceof Error ? error.message : 'APIトークンの削除に失敗しました。',
				tone: 'error',
			};
		} finally {
			isDeletingContentsProvider = false;
		}
	};
</script>

<section class="space-y-6 px-6 py-8">
	<header class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold text-slate-900">設定</h1>
		<p class="text-sm text-slate-600">
			Fujino Cloud と Mobili Platform
			間の連携トークンを管理します。方向ごとにトークンが異なるため、使い道を確認して設定してください。
		</p>
	</header>

	{#if deviceBanner}
		<div
			class={`rounded-md border px-4 py-3 text-sm ${
				deviceBanner.tone === 'success'
					? 'border-emerald-300 bg-emerald-50 text-emerald-800'
					: 'border-rose-300 bg-rose-50 text-rose-800'
			}`}
		>
			{deviceBanner.text}
		</div>
	{/if}

	<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-100 px-6 py-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-medium text-slate-900">Fujino Cloud → Mobili Platform</h2>
					<p class="text-sm text-slate-500">
						Mobili Platform API
						を呼び出すためのデバイストークンです。組織ごとに発行したトークンを保存すると、Fujino
						Cloud からのリクエストに自動適用されます。
					</p>
				</div>
				<div
					class={`rounded-full px-3 py-1 text-xs font-semibold ${
						$deviceTokenReady ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
					}`}
				>
					{$deviceTokenReady ? '登録済み' : '未登録'}
				</div>
			</div>
			{#if deviceLastUpdated}
				<p class="mt-3 text-xs text-slate-400">
					最終更新: {formatTimestamp(deviceLastUpdated)}
				</p>
			{/if}
		</div>

		<div class="space-y-6 px-6 py-6">
			<form class="space-y-4" onsubmit={saveDeviceToken}>
				<div class="flex flex-col gap-2">
					<label for="token" class="text-sm font-medium text-slate-700">デバイストークン</label>
					<input
						id="token"
						name="token"
						bind:value={tokenInput}
						type="text"
						placeholder="device_xxxxxxxx"
						class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
						autocomplete="off"
					/>
					<p class="text-xs text-slate-400">
						保存済みのトークンは表示されません。再設定する場合は新しいトークンを入力してください。
					</p>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<button
						type="submit"
						class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-indigo-300"
						disabled={isSavingDevice || !tokenInput.trim()}
					>
						{isSavingDevice ? '保存中…' : '保存する'}
					</button>
				</div>
			</form>
			{#if $deviceTokenReady}
				<button
					type="button"
					onclick={deleteDeviceToken}
					class="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:text-rose-300"
					disabled={isDeletingDevice}
				>
					{isDeletingDevice ? '削除中…' : 'トークンを削除'}
				</button>
			{/if}
		</div>
	</div>

	{#if contentsProviderBanner}
		<div
			class={`rounded-md border px-4 py-3 text-sm ${
				contentsProviderBanner.tone === 'success'
					? 'border-emerald-300 bg-emerald-50 text-emerald-800'
					: 'border-rose-300 bg-rose-50 text-rose-800'
			}`}
		>
			{contentsProviderBanner.text}
		</div>
	{/if}

	<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-100 px-6 py-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-medium text-slate-900">Mobili Platform → Fujino Cloud</h2>
					<p class="text-sm text-slate-500">
						Mobili Platform から Fujino Cloud のコンテンツ提供 API
						を呼び出すためのトークンです。発行/再発行すると新しいトークンが一度だけ表示されます。
					</p>
				</div>
				<div
					class={`rounded-full px-3 py-1 text-xs font-semibold ${
						contentsProviderApiToken.hasToken
							? 'bg-emerald-100 text-emerald-700'
							: 'bg-slate-100 text-slate-500'
					}`}
				>
					{contentsProviderApiToken.hasToken ? '発行済み' : '未発行'}
				</div>
			</div>
			{#if contentsProviderApiToken.updatedAt}
				<p class="mt-3 text-xs text-slate-400">
					最終更新: {formatTimestamp(contentsProviderApiToken.updatedAt)}
					{#if contentsProviderApiToken.lastFour}
						（末尾 {contentsProviderApiToken.lastFour}）
					{/if}
				</p>
			{/if}
		</div>

		<div class="space-y-6 px-6 py-6">
			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={renewContentsProviderToken}
					class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-indigo-300"
					disabled={isIssuingContentsProvider}
				>
					{isIssuingContentsProvider
						? '発行中…'
						: contentsProviderApiToken.hasToken
							? '再発行する'
							: '発行する'}
				</button>
				{#if contentsProviderApiToken.hasToken}
					<button
						type="button"
						onclick={deleteContentsProviderToken}
						class="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:text-rose-300"
						disabled={isDeletingContentsProvider}
					>
						{isDeletingContentsProvider ? '削除中…' : 'トークンを削除'}
					</button>
				{/if}
			</div>

			{#if contentsProviderIssuedToken}
				<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
					<p class="text-sm font-medium text-amber-800">
						このトークンは一度しか表示されません。必ず安全な場所に保管してください。
					</p>
					<div
						class="mt-2 rounded-md bg-white px-3 py-2 font-mono text-xs text-slate-800 shadow-inner"
					>
						{contentsProviderIssuedToken}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Member Management Section -->
	<div class="rounded-xl border border-slate-200 bg-white shadow-sm mt-8">
		<div class="border-b border-slate-100 px-6 py-4">
			<h2 class="text-lg font-medium text-slate-900">メンバー管理</h2>
			<p class="text-sm text-slate-500">
				この組織に所属するメンバーを管理します。追加したいユーザーのメールアドレスを入力して招待してください。
			</p>
		</div>

		<div class="space-y-6 px-6 py-6">
			<!-- Invite Form -->
			<div class="bg-gray-50 p-4 rounded-lg border border-gray-100">
				<h3 class="text-sm font-semibold mb-2">メンバーを招待</h3>
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
					<div class="flex-grow w-full">
						<input
							type="email"
							name="email"
							placeholder="user@example.com"
							bind:value={inviteEmail}
							class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
							required
						/>
						{#if form?.notFound}
							<p class="text-red-600 text-xs mt-1">ユーザーが見つかりません。</p>
						{:else if form?.alreadyExists}
							<p class="text-red-600 text-xs mt-1">このユーザーは既にメンバーです。</p>
						{:else if form?.error}
							<p class="text-red-600 text-xs mt-1">{form.error}</p>
						{/if}
					</div>
					<button
						type="submit"
						disabled={isInviting}
						class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
					>
						{isInviting ? '招待中...' : '招待'}
					</button>
				</form>
			</div>

			<!-- Member List -->
			<div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
				<table class="min-w-full divide-y divide-gray-300 bg-white">
					<thead class="bg-gray-50">
						<tr>
							<th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">名前</th>
							<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">メールアドレス</th>
							<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">権限</th>
							<th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
								<span class="sr-only">操作</span>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each data.members || [] as member (member.id)}
							<tr>
								<td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
									<div class="flex items-center">
										{#if member.photoURL}
											<img class="h-8 w-8 rounded-full mr-3" src={member.photoURL} alt="" />
										{:else}
											<div class="h-8 w-8 rounded-full bg-gray-200 mr-3 flex items-center justify-center text-xs text-gray-500">
												{(member.name || '?').charAt(0).toUpperCase()}
											</div>
										{/if}
										{member.name}
									</div>
								</td>
								<td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{member.email ?? 'Unknown'}</td>
								<td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">admin</td>
								<td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
									{#if member.userId !== data.user?.uid}
										<form method="POST" action="?/delete" use:enhance>
											<input type="hidden" name="memberId" value={member.id} />
											<button type="submit" class="text-red-600 hover:text-red-900 text-xs font-semibold">削除</button>
										</form>
									{:else}
										<span class="text-gray-400 cursor-not-allowed text-xs" title="自分自身は削除できません">削除</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if form?.cannotDeleteSelf}
				<div class="mt-4 p-4 rounded-md bg-red-50">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
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
</section>
