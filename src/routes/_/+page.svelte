<script lang="ts">
	import { currentMembers } from '../../lib/stores/members.store';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

{#if $currentMembers.length > 0}
	<iframe
		src={data.iframeUrl}
		frameborder="0"
		height="1000"
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
