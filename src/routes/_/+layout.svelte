<script lang="ts">
	let { children } = $props();
</script>

<div class="flex justify-between gap-2 p-4">
	<div class="flex">
		<div class="mr-3">
			<a href="/_/"> Logo </a>
		</div>
		<a href="/_/gps-analysis">GPSデータの分析</a>
	</div>
	<a href="/login">ログアウト</a>
</div>

<div class="p-3">
	{@render children?.()}
</div>
