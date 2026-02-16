<script lang="ts">
	import { ChevronsUpDown, Check, PlusCircle } from 'lucide-svelte';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuGroup,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuShortcut,
		DropdownMenuTrigger,
		DropdownMenuSub,
		DropdownMenuSubContent,
		DropdownMenuSubTrigger,
	} from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { cn } from '$lib/utils';
	import { currentMembers } from '$lib/accessors/members.store';
	import { page } from '$app/state';
	import { t } from '$lib/i18n';

	let { class: className = undefined } = $props();

	// Derived state for active org
	const activeOrg = $derived(
		page.params.oid ? $currentMembers.find((member) => member.orgId === page.params.oid) : null,
	);

	let open = $state(false);
</script>

<DropdownMenu bind:open>
	<DropdownMenuTrigger>
		{#snippet child({ props })}
			<Button
				variant="outline"
				role="combobox"
				aria-expanded={open}
				aria-label="Select an organization"
				class={cn('w-[200px] justify-between', className)}
				{...props}
			>
				<div class="flex items-center gap-2 truncate">
					{#if activeOrg}
						<!-- Placeholder avatar for org -->
						<Avatar class="mr-2 h-5 w-5">
							<AvatarImage
								src={`https://avatar.vercel.sh/${activeOrg.orgId}.png`}
								alt={activeOrg.name}
							/>
							<AvatarFallback>O</AvatarFallback>
						</Avatar>
						{activeOrg.name}
					{:else}
						{$t('layout.selectOrgPrompt')}
					{/if}
				</div>
				<ChevronsUpDown class="ml-auto h-4 w-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</DropdownMenuTrigger>
	<DropdownMenuContent class="w-[200px]">
		<DropdownMenuGroup>
			<DropdownMenuLabel>{$t('layout.selectOrgPrompt')}</DropdownMenuLabel>
			{#each $currentMembers as member (member.orgId)}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={`/_/orgs/${member.orgId}`} class="block">
					<DropdownMenuItem class="cursor-pointer">
						<Avatar class="mr-2 h-5 w-5">
							<AvatarImage src={`https://avatar.vercel.sh/${member.orgId}.png`} alt={member.name} />
							<AvatarFallback>O</AvatarFallback>
						</Avatar>
						{member.name}
						<Check
							class={cn(
								'ml-auto h-4 w-4',
								activeOrg?.orgId === member.orgId ? 'opacity-100' : 'opacity-0',
							)}
						/>
					</DropdownMenuItem>
				</a>
			{/each}
		</DropdownMenuGroup>
		<!--
		<DropdownMenuSeparator />
		<DropdownMenuItem>
			<PlusCircle class="mr-2 h-4 w-4" />
			Create Team
		</DropdownMenuItem>
        -->
	</DropdownMenuContent>
</DropdownMenu>
