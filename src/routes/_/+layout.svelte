<script lang="ts">
	import { currentUser } from '../../lib/current-user';

	let { children } = $props();
</script>

<div class="w-full bg-white shadow">
	<div class="mx-auto flex max-w-5xl items-center justify-between gap-2 p-4">
		<div class="flex items-center gap-4">
			<a href="/_/" class="font-bold text-gray-800">
				<img src="/logo.png" alt="藤野クラウド ロゴ" class="h-28" />
			</a>
			<a href="/_/gps-analysis" class="text-gray-600 hover:text-gray-900"> GPSデータの分析 </a>
		</div>

		<!-- ✅ user section -->
		<div class="flex items-center gap-3 text-sm text-gray-700">
			{#if $currentUser}
				<span>こんにちは、{$currentUser.displayName || $currentUser.email} さん</span>
				<a
					href="/login"
					class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-gray-700 shadow-sm transition hover:bg-gray-100 hover:text-gray-900"
				>
					ログアウト
				</a>
			{:else}
				<a
					href="/login"
					class="rounded-lg bg-blue-500 px-3 py-1 text-white shadow-sm transition hover:bg-blue-600"
				>
					ログイン
				</a>
			{/if}
		</div>
	</div>
</div>

<div class="p-3">
	{@render children?.()}
</div>
