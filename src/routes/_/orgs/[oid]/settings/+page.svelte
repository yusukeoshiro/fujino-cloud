<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import FujinoToMobili from './FujinoToMobili.svelte';
	import MobiliToFujino from './MobiliToFujino.svelte';
	import UserManagement from './UserManagement.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeTab = $state('system'); // 'system' or 'users'
</script>

<section class="space-y-6 px-6 py-8">
	<header class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold text-slate-900">設定</h1>
		<p class="text-sm text-slate-600">システム連携設定およびユーザー管理を行います。</p>
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
				システム連携
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
				ユーザー管理
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
	</div>
</section>
