<script lang="ts">
	import { page } from '$app/state';
	import { type Snippet } from 'svelte';

	let { children }: { children: Snippet<[]> } = $props();

	type Item = { label: string; path: string; exact?: boolean };

	const base = $derived(`/_/orgs/${page.params.oid}/gps-conditioning`);
	const items: Item[] = $derived([
		{ label: 'ダッシュボード', path: base, exact: true },
		{ label: 'ゲームスコアの管理', path: `${base}/game-score` },
		{ label: 'トレーニング予算の管理', path: `${base}/budget` },
		{ label: '日次GPSデータのアップロード', path: `${base}/upload` },
		{ label: 'アップロード履歴', path: `${base}/performance-assessments` },
	]);

	const isActive = (item: Item) =>
		item.exact ? page.url.pathname === item.path : page.url.pathname.startsWith(item.path);
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<nav class="sticky top-0 z-[60] border-b border-slate-200 bg-white">
	<ul class="flex justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 sm:gap-6">
		{#each items as item (item.path)}
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={item.path}
					class={`rounded-md px-3 py-1.5 transition-colors ${isActive(item) ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}
				>
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<div class="pt-4">
	{@render children?.()}
</div>
