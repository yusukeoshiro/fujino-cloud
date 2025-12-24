<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import FujinoToMobili from './FujinoToMobili.svelte';
	import MobiliToFujino from './MobiliToFujino.svelte';
	import UserManagement from './UserManagement.svelte';
	import { t, locale, locales } from 'svelte-i18n';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeTab = $state('system'); // 'system' or 'users' or 'language'
</script>

<section class="space-y-6 px-6 py-8">
	<header class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold text-slate-900">{$t('settings.title')}</h1>
		<p class="text-sm text-slate-600">{$t('settings.description')}</p>
	</header>

	<!-- Tab Navigation -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8" aria-label="Tabs">
			<button
				onclick={() => (activeTab = 'system')}
				class={`${
					activeTab === 'system'
						? 'border-indigo-500 text-indigo-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				} border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap`}
				aria-current={activeTab === 'system' ? 'page' : undefined}
			>
				{$t('settings.tab.system')}
			</button>
			<button
				onclick={() => (activeTab = 'users')}
				class={`${
					activeTab === 'users'
						? 'border-indigo-500 text-indigo-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				} border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap`}
				aria-current={activeTab === 'users' ? 'page' : undefined}
			>
				{$t('settings.tab.users')}
			</button>
			<button
				onclick={() => (activeTab = 'language')}
				class={`${
					activeTab === 'language'
						? 'border-indigo-500 text-indigo-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				} border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap`}
				aria-current={activeTab === 'language' ? 'page' : undefined}
			>
				{$t('settings.tab.language')}
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	<div class="mt-6">
		<div class={activeTab === 'system' ? 'block' : 'hidden'}>
			<div class="space-y-6">
				<FujinoToMobili {data} />
				<MobiliToFujino {data} />
			</div>
		</div>
		<div class={activeTab === 'users' ? 'block' : 'hidden'}>
			<UserManagement {data} {form} />
		</div>
		<div class={activeTab === 'language' ? 'block' : 'hidden'}>
			<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
				<div class="border-b border-slate-100 px-6 py-4">
					<h2 class="text-lg font-medium text-slate-900">{$t('settings.tab.language')}</h2>
				</div>
				<div class="p-6">
					<label for="language" class="block text-sm font-medium text-gray-700"
						>{$t('language.label')}</label
					>
					<select
						id="language"
						class="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
						bind:value={$locale}
					>
						{#each $locales as l (l)}
							<option value={l}>{l}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
	</div>
</section>
