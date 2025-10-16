<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { iframeUrl } = data;

	// columns to display (left-to-right)

	const HEADER_COLS = ['氏名'];

	const DISPLAY_COLS = [
		// 'タイプ',
		// '日付',
		// '開始時刻',
		// '終了時刻',
		// '氏名',
		// '生年月日',
		'継続時間(分)',
		'総走行距離(m)',
		'1分当たり距離(m/min)',
		'最高速度(km/h)',
		// 'HSR回数',
		// 'HSR距離(m)',

		'高強度距離(m)',
		'高強度割合',

		'スプリント回数',
		'スプリント距離(m)',
		'Z1距離(m)',
		'ウォーキング割合',

		// 'Z3距離(m)',
		// 'Z4距離(m)',
		// 'Z5距離(m)',
		// '加速Z4回数',
		'加速Z5回数',
		'加速Z6回数',
		'加速合計回数',
		'爆発的加速回数',
		// '減速Z4回数',
		'減速Z5回数',
		'減速Z6回数',
		'減速合計回数',
		'爆発的減速回数',
		// 'トレーニングスコア消費',
	];

	const FOOTER_COLS = ['トレーニングスコア消費'];

	function fmt(v: unknown): string {
		if (v === null || v === undefined || v === '') return '—';
		if (typeof v === 'number' && Number.isFinite(v)) return v.toLocaleString();
		return String(v);
	}

	let isOver = false;
	let uploading = false;
	let result: {
		rows: number;
		headers: string[];
		records: Array<Record<string, unknown>>;
	} | null = $state(null);

	let error: string | null = null;
	let fileInput: HTMLInputElement;

	async function uploadFile(file: File) {
		if (!file) return;
		error = null;
		result = null;
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);

			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			if (!res.ok) throw new Error(await res.text());
			result = await res.json();
		} catch (e: any) {
			error = e?.message ?? 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) uploadFile(file);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'copy';
		isOver = true;
	}

	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		isOver = false;
	}

	function onPick(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) uploadFile(file);
	}

	const hideTeamAverage = true;

	// ✅ compute rows reactively (no {#let})

	// let rows: Array<Record<string, unknown>> = [];
	let rows = $derived(
		result && Array.isArray(result.records)
			? hideTeamAverage
				? result.records.filter((r) => r['Player Name'] !== 'Team Average')
				: result.records
			: [],
	);
	// $: rows =
	// 	result && Array.isArray(result.records)
	// 		? hideTeamAverage
	// 			? result.records.filter((r) => r['Player Name'] !== 'Team Average')
	// 			: result.records
	// 		: [];

	onMount(() => {
		console.log({ iframeUrl, data });
	});
</script>

<h1 class="mb-4 text-xl font-semibold">GPSデータの分析</h1>

<!-- Hot spot / dropzone -->
<div
	class="cursor-pointer rounded-2xl border-2 border-dashed bg-white/40 p-10
         text-center transition
         select-none hover:bg-white/70
         {isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}"
	on:drop={onDrop}
	on:dragover={onDragOver}
	on:dragleave={onDragLeave}
	on:click={() => fileInput?.click()}
>
	<p class="mb-2 font-medium">CSVファイルをここにドロップ</p>
	<p class="text-sm text-gray-500">またはクリックして選択</p>
	<input
		bind:this={fileInput}
		type="file"
		accept=".csv,text/csv"
		class="hidden"
		on:change={onPick}
	/>
</div>

{#if uploading}
	<p class="mt-4">アップロード中…</p>
{/if}

{#if error}
	<p class="mt-4 text-red-600">{error}</p>
{/if}

{#if result}
	<div class="mt-6 space-y-4">
		<div>
			<p class="font-medium">サマリー</p>
			<p>行数: {result.rows}</p>
			<!-- <p>ヘッダー: {result.headers.join(', ')}</p> -->
		</div>

		<!-- Data table -->
		{#if rows.length}
			<div class="overflow-auto rounded-xl border border-gray-200 shadow-sm">
				<table class="min-w-full border-collapse">
					<thead class="sticky top-0 z-10 bg-gray-50">
						<tr>
							<!-- <th class="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap text-gray-700">
								Player Name
							</th> -->
							{#each DISPLAY_COLS as col}
								<th
									class="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap text-gray-700"
								>
									{col}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows as row, i}
							<tr class="{i % 2 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50">
								<!-- <td class="px-3 py-2 text-sm font-medium text-gray-900">
									{fmt(row['Player Name'])}
								</td> -->
								{#each DISPLAY_COLS as col}
									<td class="px-3 py-2 text-sm text-gray-900 tabular-nums">
										{fmt(row[col])}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-sm text-gray-500">No records to display.</p>
		{/if}
	</div>

	<div class="flex flex-col items-center">
		<button class=" rounded-2xl bg-gray-500 px-5 py-3 text-white">アップロード</button>
	</div>
{/if}

<!-- <iframe
	src={iframeUrl}
	frameborder="0"
	height="600"
	allowtransparency
	class="w-full"
	title="GPS Data Analysis"
></iframe> -->

<style>
	.tabular-nums {
		font-variant-numeric: tabular-nums;
	}
	thead th,
	tbody td {
		border-bottom: 1px solid #e5e7eb;
	}
</style>
