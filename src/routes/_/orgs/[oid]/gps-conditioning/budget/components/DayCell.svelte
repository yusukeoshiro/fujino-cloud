<script lang="ts">
	import { t } from '$lib/i18n';
	import * as Popover from '$lib/components/ui/popover';
	import { tick } from 'svelte';

	interface Props {
		day: {
			iso: string;
			label: string;
			isCurrentYear: boolean;
			isToday: boolean;
			events: { id: string; eventName: string; eventDate: string }[];
			isAltMonth: boolean;
		};
		onRemoveEventClick: (id: string) => void;
		onAddEventSubmit: (date: string, name: string) => void;
	}

	let { day, onRemoveEventClick, onAddEventSubmit }: Props = $props();

	let addEventDraft = $state('');
	let addEventInputEl = $state<HTMLInputElement | null>(null);
	let isOpen = $state(false);

	function onOpenChange(open: boolean) {
		isOpen = open;
		if (open) {
			addEventDraft = '';
			tick().then(() => {
				addEventInputEl?.focus();
			});
		}
	}

	function handleSubmit() {
		if (!addEventDraft.trim()) return;
		onAddEventSubmit(day.iso, addEventDraft);
		addEventDraft = '';
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.isComposing) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			handleSubmit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			isOpen = false;
		}
	}
</script>

<div
	class="group relative flex h-full w-full flex-col gap-1 p-2 transition-colors hover:bg-slate-200"
	class:bg-white={day.isCurrentYear && !day.isAltMonth && !day.isToday}
	class:bg-slate-50={day.isCurrentYear && day.isAltMonth && !day.isToday}
	class:bg-slate-100={!day.isCurrentYear && !day.isToday}
	class:text-slate-400={!day.isCurrentYear}
>
	{#if day.isToday}
		<div
			class="pointer-events-none absolute inset-0 z-0 bg-indigo-200 opacity-30"
			aria-hidden="true"
		></div>
	{/if}

	<div class="relative z-10 flex items-center justify-between">
		<span class="font-semibold">{day.label}</span>

		<Popover.Root bind:open={isOpen} {onOpenChange}>
			<Popover.Trigger
				class="cursor-pointer rounded-full bg-gray-800 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100 data-[state=open]:opacity-100"
				onclick={(event) => event.stopPropagation()}
			>
				＋
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					class="z-[9999] w-64 rounded-md border border-slate-300 bg-white p-2 shadow-md"
				>
					<div class="flex flex-col gap-2">
						<input
							type="text"
							placeholder={$t('gps.budget.eventPlaceholder')}
							bind:value={addEventDraft}
							bind:this={addEventInputEl}
							class="rounded border border-slate-300 px-2 py-1 text-slate-900"
							onkeydown={handleKeydown}
						/>
						<div class="flex justify-end gap-1">
							<button class="rounded bg-blue-600 px-2 py-1 text-white" onclick={handleSubmit}>
								{$t('gps.budget.add')}
							</button>
							<button
								class="rounded border border-slate-300 px-2 py-1 text-slate-700"
								onclick={() => (isOpen = false)}
							>
								{$t('gps.budget.cancel')}
							</button>
						</div>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	</div>

	<ul class="relative z-10 flex flex-1 flex-col gap-1 overflow-y-auto">
		{#each day.events.slice(0, 3) as event (event.id)}
			<li class="group/event flex items-center gap-1">
				<div
					class="flex-1 truncate rounded-full bg-slate-100 px-2 py-1 text-left text-xs text-slate-800"
					title={event.eventName}
				>
					{event.eventName}
				</div>

				<button
					type="button"
					class="cursor-pointer text-xs text-red-600 opacity-0 transition-opacity group-hover/event:opacity-100"
					onclick={(e) => {
						e.stopPropagation();
						onRemoveEventClick(event.id);
					}}
				>
					✕
				</button>
			</li>
		{/each}
		{#if day.events.length > 3}
			<li class="rounded-full bg-slate-100 px-2 py-0.5 text-center text-xs text-slate-700">
				+{day.events.length - 3}
			</li>
		{/if}
	</ul>
</div>
