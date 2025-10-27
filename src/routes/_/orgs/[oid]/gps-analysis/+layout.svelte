<script lang="ts">
	import { page } from '$app/state';
	import { type Snippet } from 'svelte';

	let { children }: { children: Snippet<[]> } = $props();
</script>

<nav class="sticky top-0 z-[60] border-b border-slate-200 bg-white">
	<ul class="flex justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 sm:gap-6">
		<li>
			<a
				href={`/_/orgs/${page.params.oid}/gps-analysis/game-score`}
				class={`rounded-md px-3 py-1.5 transition-colors
          ${
						page.url.pathname.includes('/game-score')
							? 'bg-blue-600 text-white'
							: 'hover:bg-slate-100'
					}`}
			>
				ゲームスコアの管理
			</a>
		</li>

		<li>
			<a
				href={`/_/orgs/${page.params.oid}/gps-analysis/budget`}
				class={`rounded-md px-3 py-1.5 transition-colors
          ${
						page.url.pathname.includes('/budget') ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
					}`}
			>
				トレーニング予算の管理
			</a>
		</li>

		<li>
			<a
				href={`/_/orgs/${page.params.oid}/gps-analysis/upload`}
				class={`rounded-md px-3 py-1.5 transition-colors
          ${
						page.url.pathname.includes('/upload') ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
					}`}
			>
				GPSデータのアップロード
			</a>
		</li>
	</ul>
</nav>

<div class="pt-4">
	{@render children?.()}
</div>
