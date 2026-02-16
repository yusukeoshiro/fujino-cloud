<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import { Button } from '$lib/components/ui/button';

	let { data }: { data: PageData } = $props();

	let iframUrl = $derived(data.iframeUrl);

	const buildToken = (days: number) => `past${days}days~`;

	function applyRange(days: number) {
		const url = new URL($page.url);
		url.searchParams.set('date', buildToken(days));
		// keep other query params intact; replace history to avoid stacking entries
		// eslint-disable-next-line svelte/no-navigation-without-resolve
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
			<Button
				variant={isActive(30) ? "default" : "outline"}
				size="sm"
				class="transition active:scale-[0.99]"
				onclick={() => applyRange(30)}
			>
				{$t('gps.range.pastDays', { days: 30 })}
			</Button>
			<Button
				variant={isActive(90) ? "default" : "outline"}
				size="sm"
				class="transition active:scale-[0.99]"
				onclick={() => applyRange(90)}
			>
				{$t('gps.range.pastDays', { days: 90 })}
			</Button>
			<Button
				variant={isActive(180) ? "default" : "outline"}
				size="sm"
				class="transition active:scale-[0.99]"
				onclick={() => applyRange(180)}
			>
				{$t('gps.range.pastDays', { days: 180 })}
			</Button>
			<Button
				variant={isActive(365) ? "default" : "outline"}
				size="sm"
				class="transition active:scale-[0.99]"
				onclick={() => applyRange(365)}
			>
				{$t('gps.range.pastDays', { days: 365 })}
			</Button>
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
						{$t('gps.dashboard.unavailable')}
					</h2>
					<p class="text-sm text-gray-500">{$t('gps.dashboard.contactAdmin')}</p>
				</div>
			</div>
		{/if}
	</div>
</div>
