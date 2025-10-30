<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { COLUMNS, FOOTER_COLS, HEADER_COLS } from './utils/headers.util';

	const orgId = page.params.oid;
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

	type UploadPreviewRecord = Record<string, unknown>;
	type UploadPreviewResponse = {
		rows: number;
		headers: string[];
		records: UploadPreviewRecord[];
	};

	let isOver = $state(false);
	let uploading = $state(false);
	let committing = $state(false); // ✅ NEW

	let result = $state<UploadPreviewResponse | null>(null);

	let errorHeadline: string | null = $state(null);
	let errorDetails: string[] = $state([]);
	let fileInput: HTMLInputElement | null = $state(null);
	let lastFile: File | null = $state(null);

	// ✅ post-commit hook (write your logic here)
	function onCommitSuccess() {
		// e.g., show toast / navigate / reset
		// result = null; lastFile = null;
		goto(`/_/orgs/${page.params.oid}/gps-analysis`);
	}

	async function uploadFile(file: File) {
		if (!file) return;
		if (!orgId) {
			setError('組織IDが特定できません。');
			return;
		}
		setError(null);
		result = null;
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);

			const res = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/upload`, {
				method: 'POST',
				body: fd,
			});
			if (!res.ok) {
				const contentType = res.headers.get('content-type') ?? '';
				if (contentType.includes('application/json')) {
					const payload = await res.json();
					const errorDetailsPayload = Array.isArray(payload?.details)
						? payload.details
						: [];
					const err = new Error(
						typeof payload?.message === 'string'
							? payload.message
							: 'アップロードに失敗しました。',
					) as Error & { details?: unknown };
					err.details = errorDetailsPayload;
					throw err;
				}
				throw new Error(await res.text());
			}
			result = await res.json();
		} catch (e: any) {
			const details: string[] = [];
			const rawDetails = e?.details;
			if (Array.isArray(rawDetails)) {
				for (const item of rawDetails) {
					if (typeof item === 'string') {
						details.push(item);
					} else if (
						item &&
						typeof item === 'object' &&
						'description' in item &&
						typeof item.description === 'string'
					) {
						details.push(item.description);
					} else if (
						item &&
						typeof item === 'object' &&
						('row' in item || 'playerName' in item || 'jerseyNo' in item)
					) {
						const row =
							typeof (item as { row?: unknown }).row === 'number'
								? `行${(item as { row: number }).row}`
								: '';
						const playerName =
							typeof (item as { playerName?: unknown }).playerName === 'string'
								? `選手名「${(item as { playerName: string }).playerName}」`
								: '';
						const jerseyNo =
							typeof (item as { jerseyNo?: unknown }).jerseyNo === 'string'
								? `背番号「${(item as { jerseyNo: string }).jerseyNo}」`
								: '';
						const parts = [row, playerName, jerseyNo].filter(Boolean);
						if (parts.length) {
							details.push(parts.join(' '));
						}
					}
				}
			}
			setError(typeof e?.message === 'string' ? e.message : 'アップロードに失敗しました。', details);
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
			setError('先にファイルを選択してください。');
			return;
		}
		if (!orgId) {
			setError('組織IDが特定できません。');
			return;
		}
		committing = true; // ✅ start spinner
		setError(null);
		try {
			const fd = new FormData();
			fd.append('file', lastFile);
			const res = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/commit`, {
				method: 'POST',
				body: fd,
			});
			if (!res.ok) throw new Error(await res.text());
			onCommitSuccess(); // ✅ your hook
		} catch (e: any) {
			setError(
				typeof e?.message === 'string' ? e.message : 'コミットに失敗しました。もう一度お試しください。',
			);
		} finally {
			committing = false; // ✅ stop spinner
		}
	}

	const hideTeamAverage = true;

	// ✅ compute rows reactively (no {#let})
	const emptyRecords: UploadPreviewRecord[] = [];
	let rows = $derived<UploadPreviewRecord[]>(
		result && Array.isArray(result.records)
			? hideTeamAverage
				? result.records.filter((r: UploadPreviewRecord) => {
						const name = r['Player Name'];
						return !(typeof name === 'string' && name === 'Team Average');
					})
				: result.records
			: emptyRecords,
	);

	function setError(message: string | null, extraDetails: string[] = []) {
		if (!message) {
			errorHeadline = null;
			errorDetails = [];
			return;
		}
		const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);
		const headline = lines.shift();
		errorHeadline = headline ?? message;
		errorDetails = [...lines, ...extraDetails];
	}
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
			<h2 class="text-lg">Fitogetherの形式を認識しました。</h2>
		{/if}

		{#if uploading}
			<p class="mt-4 flex items-center gap-2">
				<!-- inline spinner -->
				<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
					<circle
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
						fill="none"
						opacity="0.25"
					/>
					<path
						d="M22 12a10 10 0 0 1-10 10"
						fill="none"
						stroke="currentColor"
						stroke-width="4"
						stroke-linecap="round"
					/>
				</svg>
				アップロード中…
			</p>
		{/if}

		{#if errorHeadline}
			<div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
				<p class="font-semibold">{errorHeadline}</p>
				{#if errorDetails.length}
					<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
						{#each errorDetails as detail}
							<li>{detail}</li>
						{/each}
					</ul>
				{/if}
			</div>
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
					class="flex items-center gap-2 rounded-2xl bg-gray-500 px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
					on:click={commitUpload}
					disabled={!lastFile || uploading || committing}
					aria-busy={committing}
				>
					{#if committing}
						<!-- inline spinner -->
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
							<circle
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								fill="none"
								opacity="0.25"
							/>
							<path
								d="M22 12a10 10 0 0 1-10 10"
								fill="none"
								stroke="currentColor"
								stroke-width="4"
								stroke-linecap="round"
							/>
						</svg>
						コミット中…
					{:else}
						このデータをアップロードする
					{/if}
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
