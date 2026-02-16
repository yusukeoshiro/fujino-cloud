<script lang="ts">
	import { page } from '$app/state';
	import { type Snippet } from 'svelte';
	import { t } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { LayoutDashboard, Target, ChartPie, Upload, History } from 'lucide-svelte';

	let { children }: { children: Snippet<[]> } = $props();

	type Item = { labelKey: string; path: string; exact?: boolean; icon: typeof LayoutDashboard };

	const base = $derived(`/_/orgs/${page.params.oid}/gps-conditioning`);
	const items: Item[] = $derived([
		{ labelKey: 'gps.nav.dashboard', path: base, exact: true, icon: LayoutDashboard },
		{
			labelKey: 'gps.nav.workloadBenchmark',
			path: `${base}/workload-benchmark`,
			icon: Target,
		},
		{ labelKey: 'gps.nav.budget', path: `${base}/budget`, icon: ChartPie },
		{ labelKey: 'gps.nav.upload', path: `${base}/upload`, icon: Upload },
		{ labelKey: 'gps.nav.history', path: `${base}/performance-assessments`, icon: History },
	]);

	const activeValue = $derived(
		items.find((item) =>
			item.exact ? page.url.pathname === item.path : page.url.pathname.startsWith(item.path),
		)?.path ?? base,
	);
</script>

<div class="border-b border-slate-200 bg-white">
	<Tabs value={activeValue} class="w-full">
		<TabsList class="w-full justify-start rounded-none bg-transparent p-0">
			{#each items as item (item.path)}
				<TabsTrigger
					value={item.path}
					onclick={() => goto(item.path)}
					class="relative h-10 rounded-none border-b-2 border-transparent px-4 pt-2 pb-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
				>
					<item.icon class="mr-2 h-4 w-4" />
					{$t(item.labelKey)}
				</TabsTrigger>
			{/each}
		</TabsList>
	</Tabs>
</div>

<div class="pt-4">
	{@render children?.()}
</div>
