<script lang="ts">
	let { children } = $props();
</script>

<div class="w-full bg-white shadow">
	<div class="mx-auto flex max-w-5xl items-center justify-between gap-2 p-4">
		<div class="flex items-center gap-4">
			<a href="/_/" class="font-bold text-gray-800">
				<img src="/logo.png" alt="" class=" h-28" />
			</a>
			<a href="/_/gps-analysis" class="text-gray-600 hover:text-gray-900"> GPSデータの分析 </a>
		</div>
		<a href="/login" class="text-gray-600 hover:text-gray-900">ログアウト</a>
	</div>
</div>
<div class="p-3">
	{@render children?.()}
</div>
