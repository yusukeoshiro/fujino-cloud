<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import { t } from '$lib/i18n';
	import { currentMembers } from '$lib/accessors/members.store';
	import * as Tabs from '$lib/components/ui/tabs';
	import { goto } from '$app/navigation';

	let { class: className } = $props();

	const menus = [
		{
			path: (oid: string) => `/_/orgs/${oid}/gps-conditioning/dashboard`,
			basePath: (oid: string) => `/_/orgs/${oid}/gps-conditioning`,
			value: 'gps-conditioning',
			labelKey: 'layout.menu.gpsConditioning',
		},
	];

	let activeTab = $state('gps-conditioning');

	$effect(() => {
		const currentPath = page.url.pathname;
		const found = menus.find(
			(m) => page.params.oid && currentPath.startsWith(m.basePath(page.params.oid)),
		);
		if (found) {
			activeTab = found.value;
		} else {
			activeTab = '';
		}
	});

	function handleValueChange(value: string) {
		const oid = page.params.oid;
		if (!oid) return;
		const menu = menus.find((m) => m.value === value);
		if (menu) {
			goto(menu.path(oid));
		}
	}
</script>

{#if page.params.oid && $currentMembers.length > 0}
	<nav class={cn('flex items-center', className)}>
		<Tabs.Root value={activeTab} onValueChange={handleValueChange} class="w-full">
			<Tabs.List class="bg-transparent p-0">
				{#each menus as menu (menu.value)}
					<Tabs.Trigger
						value={menu.value}
						class="relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:text-white"
					>
						{$t(menu.labelKey)}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>
	</nav>
{/if}
