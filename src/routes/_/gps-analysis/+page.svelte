<script lang="ts">
	import { sampleResult } from './utils/sample-data.util';
	import { COLUMNS, FOOTER_COLS, HEADER_COLS } from './utils/headers.util';

	// columns to display (left-to-right)

	const stickyLeft =
		'sticky left-0 z-20 bg-gray-50 after:absolute after:inset-y-0 after:-right-px after:w-px after:bg-gray-200';
	const stickyRight =
		'sticky right-0 z-20 bg-gray-50 before:absolute before:inset-y-0 before:-left-px before:w-px before:bg-gray-200';

	function colStickyClass(col: string) {
		if (HEADER_COLS.includes(col)) return stickyLeft;
		if (FOOTER_COLS.includes(col)) return stickyRight;
		return '';
	}

	function fmt(v: unknown): string {
		if (v === null || v === undefined || v === '') return '—';
		if (typeof v === 'number' && Number.isFinite(v)) return v.toLocaleString();
		return String(v);
	}

	let isOver = $state(false);
	let uploading = $state(false);
	let result: {
		rows: number;
		headers: string[];
		records: Array<Record<string, unknown>>;
	} | null = $state(null);

	let error: string | null = $state(null);
	let fileInput: HTMLInputElement | null = $state(null);
	let lastFile: File | null = $state(null);

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
		const file = e.dataTransfer?.files?.[0] ?? null;
		if (file) {
			lastFile = file; // <-- remember
			uploadFile(file); // preview
		}
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
		const file = input.files?.[0] ?? null;
		if (file) {
			lastFile = file; // <-- remember
			uploadFile(file); // preview
		}
	}

	async function commitUpload() {
		if (!lastFile) {
			error = '先にファイルを選択してください。';
			return;
		}
		uploading = true;
		error = null;
		try {
			const fd = new FormData();
			fd.append('file', lastFile);
			const res = await fetch('/api/commit', { method: 'POST', body: fd });
			if (!res.ok) throw new Error(await res.text());
			// optional: toast / navigate / clear state
		} catch (e: any) {
			error = e?.message ?? 'Commit failed';
		} finally {
			uploading = false;
		}
	}

	const hideTeamAverage = true;

	// ✅ compute rows reactively (no {#let})
	let rows = $derived(
		result && Array.isArray(result.records)
			? hideTeamAverage
				? result.records.filter((r) => r['Player Name'] !== 'Team Average')
				: result.records
			: [],
	);
</script>

<div class="w-full">
	<div class="mx-auto max-w-5xl">
		<h1 class="mb-4 text-2xl font-semibold">GPSデータの分析</h1>

		{#if !result}
			<!-- Hot spot / dropzone -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore event_directive_deprecated -->
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
		{/if}

		{#if result}
			<h1 class=" text-xl font-bold">CSV解析結果</h1>
		{/if}

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
									{#each COLUMNS as col}
										<th
											class={'px-3 py-2 text-left text-sm font-semibold whitespace-nowrap text-gray-700 ' +
												colStickyClass(col)}
										>
											<nobr>
												{col}
											</nobr>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each rows as row, i}
									<tr class="{i % 2 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50">
										{#each COLUMNS as col}
											<td
												class={'bg-inherit px-3 py-2 text-sm text-gray-900 tabular-nums ' +
													colStickyClass(col)}
											>
												<nobr>
													{fmt(row[col])}
												</nobr>
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

			<div class="mt-4 flex flex-col items-center">
				<button
					class="rounded-2xl bg-gray-500 px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
					on:click={commitUpload}
					disabled={!lastFile || uploading}
				>
					このデータをアップロードする
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.tabular-nums {
		font-variant-numeric: tabular-nums;
	}
	thead th,
	tbody td {
		border-bottom: 1px solid #e5e7eb;
	}
</style>
