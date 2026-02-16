<script lang="ts">
	import MainNav from './main-nav.svelte';
	import UserNav from './user-nav.svelte';
	import OrgSwitcher from './org-switcher.svelte';
	import { t } from '$lib/i18n';
	import { Settings } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
</script>

<header class="border-b bg-background">
	<div class="flex h-16 items-center px-4">
		<div class="mr-4 flex">
			<img src="/logo.png" alt={$t('app.logoAlt')} class="mr-2 h-8" />
		</div>
		<OrgSwitcher />
		<MainNav class="mx-6" />
		<div class="ml-auto flex items-center space-x-4">
			{#if page.params.oid}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Button
									variant="ghost"
									size="icon"
									class="h-9 w-9"
									{...props}
									onclick={() => goto(`/_/orgs/${page.params.oid}/settings`)}
								>
									<Settings class="h-[1.2rem] w-[1.2rem]" />
									<span class="sr-only">{$t('layout.menu.orgSettings')}</span>
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>{$t('layout.menu.orgSettings')}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/if}
			<UserNav />
		</div>
	</div>
</header>
