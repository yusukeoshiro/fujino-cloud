<script lang="ts">
	import { page } from '$app/state';
	import { type Snippet } from 'svelte';

	let { children }: { children: Snippet<[]> } = $props();
</script>

<div class="flex justify-center gap-4">
	<div>
		<a href={`/_/orgs/${page.params.oid}/gps-analysis/game-score`}> ゲームスコアの管理 </a>
	</div>
	<div>
		<a href={`/_/orgs/${page.params.oid}/gps-analysis/budget`}> トレーニング予算の管理 </a>
	</div>
	<div>
		<a href={`/_/orgs/${page.params.oid}/gps-analysis/upload`}> GPSデータのアップロード </a>
	</div>
</div>

{@render children?.()}
