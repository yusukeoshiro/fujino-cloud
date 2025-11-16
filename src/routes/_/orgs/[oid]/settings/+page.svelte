<script lang="ts">
	import type { PageData } from './$types';
	import { deviceTokenAccessor } from '$lib/device-token/device-token-accessor';
	import { page } from '$app/state';

	let { data }: { data: PageData } = $props();

	const orgId = page.params.oid;

	const deviceTokenReady = deviceTokenAccessor.ready;

	const applyToken = (token: string | null) => {
		deviceTokenAccessor.set(token ?? null);
	};

	let lastUpdated = $state<string | null>(data.deviceTokenUpdatedAt ?? null);
	let banner = $state<{ text: string; tone: 'success' | 'error' } | null>(null);
	let tokenInput = $state<string>('');
	let isSaving = $state(false);
	let isDeleting = $state(false);

	applyToken(data.deviceToken ?? null);

	const ensureOrg = () => {
		if (!orgId) {
			throw new Error('組織IDが特定できませんでした。');
		}
	};

	const saveToken = async (event: SubmitEvent) => {
		event.preventDefault();
		ensureOrg();
		const trimmed = tokenInput.trim();
		if (!trimmed) {
			banner = { text: 'トークンを入力してください。', tone: 'error' };
			return;
		}
		isSaving = true;
		banner = null;
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
			lastUpdated = result.updatedAt ?? null;
			banner = { text: result.message ?? 'デバイストークンを保存しました。', tone: 'success' };
		} catch (error) {
			console.error(error);
			banner = {
				text: error instanceof Error ? error.message : 'トークンの保存に失敗しました。',
				tone: 'error',
			};
		} finally {
			isSaving = false;
		}
	};

	const deleteToken = async () => {
		ensureOrg();
		isDeleting = true;
		banner = null;
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
			lastUpdated = null;
			banner = { text: result.message ?? 'デバイストークンを削除しました。', tone: 'success' };
		} catch (error) {
			console.error(error);
			banner = {
				text: error instanceof Error ? error.message : 'トークンの削除に失敗しました。',
				tone: 'error',
			};
		} finally {
			isDeleting = false;
		}
	};
</script>

<section class="space-y-6 px-6 py-8">
	<header class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold text-slate-900">設定</h1>
		<p class="text-sm text-slate-600">
			Mobili Platform API を利用するためのデバイストークンを登録します。
		</p>
	</header>

	{#if banner}
		<div
			class={`rounded-md border px-4 py-3 text-sm ${
				banner.tone === 'success'
					? 'border-emerald-300 bg-emerald-50 text-emerald-800'
					: 'border-rose-300 bg-rose-50 text-rose-800'
			}`}
		>
			{banner.text}
		</div>
	{/if}

	<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-100 px-6 py-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-medium text-slate-900">Mobili Platform 連携</h2>
					<p class="text-sm text-slate-500">
						組織ごとに発行されたデバイストークンを保存します。保存後は API
						リクエストに自動的に利用されます。
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
			{#if lastUpdated}
				<p class="mt-3 text-xs text-slate-400">
					最終更新: {new Date(lastUpdated).toLocaleString()}
				</p>
			{/if}
		</div>

		<div class="space-y-6 px-6 py-6">
			<form class="space-y-4" onsubmit={saveToken}>
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
						disabled={isSaving || !tokenInput.trim()}
					>
						{isSaving ? '保存中…' : '保存する'}
					</button>
				</div>
			</form>
			{#if $deviceTokenReady}
				<button
					type="button"
					onclick={deleteToken}
					class="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:text-rose-300"
					disabled={isDeleting}
				>
					{isDeleting ? '削除中…' : 'トークンを削除'}
				</button>
			{/if}
		</div>
	</div>
</section>
