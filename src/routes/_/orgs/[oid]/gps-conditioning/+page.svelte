<script lang="ts">
	import { currentMembers } from '$lib/stores/members.store';
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let iframUrl = $derived(data.iframeUrl);

	const buildToken = (days: number) => `past${days}days~`;

	function applyRange(days: number) {
		const url = new URL($page.url);
		url.searchParams.set('date', buildToken(days));
		// keep other query params intact; replace history to avoid stacking entries
		goto(`${url.pathname}?${url.searchParams.toString()}`, { replaceState: true });
	}
	// for active button styling
	const currentToken = $derived($page.url.searchParams.get('date') ?? '');
	const isActive = (days: number) => currentToken === buildToken(days);
</script>

<div class="h-20"></div>

<div class="w-full">
	<div class="mx-auto max-w-screen-2xl">
		<!-- Range buttons -->
		<div class="mb-4 flex flex-wrap items-center justify-end gap-2">
			<button
				type="button"
				class="rounded-md border px-3 py-1.5 text-sm transition
							 hover:bg-gray-50 active:scale-[0.99]
							 {isActive(30) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}"
				onclick={() => applyRange(30)}
			>
				過去30日
			</button>
			<button
				type="button"
				class="rounded-md border px-3 py-1.5 text-sm transition
							 hover:bg-gray-50 active:scale-[0.99]
							 {isActive(90) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}"
				onclick={() => applyRange(90)}
			>
				過去90日
			</button>
			<button
				type="button"
				class="rounded-md border px-3 py-1.5 text-sm transition
							 hover:bg-gray-50 active:scale-[0.99]
							 {isActive(180) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}"
				onclick={() => applyRange(180)}
			>
				過去180日
			</button>
			<button
				type="button"
				class="rounded-md border px-3 py-1.5 text-sm transition
							 hover:bg-gray-50 active:scale-[0.99]
							 {isActive(365) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}"
				onclick={() => applyRange(365)}
			>
				過去365日
			</button>
		</div>

		{#if iframUrl}
			<iframe
				src={iframUrl}
				frameborder="0"
				height="1200"
				allowtransparency
				title="Embedded content"
				class="w-full rounded-lg border border-gray-200 shadow-sm"
			></iframe>
		{:else}
			<div class="flex min-h-[60vh] items-center justify-center">
				<div class="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
					<h2 class="mb-3 text-lg font-semibold text-gray-800">
						ダッシュボードの準備がされていません。
					</h2>
					<p class="text-sm text-gray-500">管理者にお問い合わせください。</p>
				</div>
			</div>
		{/if}
	</div>
</div>
