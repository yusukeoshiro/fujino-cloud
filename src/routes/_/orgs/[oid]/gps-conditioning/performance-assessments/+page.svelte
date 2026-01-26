<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { RefreshCw } from 'lucide-svelte';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';

	type PerformanceAssessmentRecord = {
		id: string;
		name: string;
		date: string;
		description?: string | null;
		orgId?: string | null;
		participantsCount: number;
		downloadLink?: string | null;
		spreadsheetUrl?: string | null;
		createdAt: string;
		updatedAt: string;
		gpsType?: string | null;
		isFujinoCreated: boolean;
		participants?: ParticipantSummary[];
	};

	type ParticipantSummary = {
		id: string;
		fullName: string;
		skipped: boolean;
		workloadConsumptionPoints: number | null;
	};

	type PageInfo = {
		count: number;
		hasNext: boolean;
		hasPrev: boolean;
		nextToken: string | null;
		prevToken: string | null;
	};

	const orgId = page.params.oid;

	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let records = $state<PerformanceAssessmentRecord[]>([]);
	let pageInfo = $state<PageInfo>({
		count: 0,
		hasNext: false,
		hasPrev: false,
		nextToken: null,
		prevToken: null,
	});

	let selectedId = $state<string | null>(null);
	let detailLoading = $state(false);
	let detailError = $state<string | null>(null);
	let detail = $state<PerformanceAssessmentRecord | null>(null);
	let csvDownloadUrl = $state<string | null>(null);
	let csvLoading = $state(false);
	let deleting = $state(false);
	let pendingDetailId = $state<string | null>(null);

	const translate = (key: string, vars?: Record<string, string | number>) => get(t)(key, vars);

	function gpsTypeLabel(value: string | null | undefined) {
		if (value === 'GAME') return translate('gps.assessments.type.game');
		if (value === 'TRAINING') return translate('gps.assessments.type.training');
		return null;
	}

	function formatDateTime(value: string | null | undefined) {
		if (!value) return '—';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return parsed.toLocaleString($locale);
	}

	function formatScore(value: number | null | undefined) {
		if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
		return value.toLocaleString($locale);
	}

	function calcTeamWorkloadConsumptionPoints(
		gpsType: string | null | undefined,
		participants: ParticipantSummary[] | null | undefined,
	) {
		if (!gpsType || !participants || participants.length === 0) return null;
		const scores = participants
			.filter((participant) => !participant.skipped)
			.map((participant) => participant.workloadConsumptionPoints)
			.filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
		if (scores.length === 0) return null;
		if (gpsType === 'GAME') {
			const total = scores.reduce((sum, score) => sum + score, 0);
			return Math.round(total / 10);
		}
		if (gpsType === 'TRAINING') {
			const total = scores.reduce((sum, score) => sum + score, 0);
			return Math.round(total / scores.length);
		}
		return null;
	}

	function assessmentUrl(id: string | null) {
		if (!id) return page.url.pathname;
		return `${page.url.pathname}?assessmentId=${encodeURIComponent(id)}`;
	}

	async function syncAssessmentId(id: string | null) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(assessmentUrl(id), { replaceState: true, keepFocus: true, noScroll: true });
	}

	async function loadList(options?: { nextToken?: string | null; prevToken?: string | null }) {
		if (!orgId) return;
		loading = true;
		errorMessage = null;
		try {
			const params = [`orgId=${encodeURIComponent(orgId)}`];
			if (options?.nextToken) {
				params.push(`nextToken=${encodeURIComponent(options.nextToken)}`);
			}
			if (options?.prevToken) {
				params.push(`prevToken=${encodeURIComponent(options.prevToken)}`);
			}
			const res = await fetch(`/api/gps-conditioning/performance-assessments?${params.join('&')}`);
			if (!res.ok) throw new Error(await res.text());
			const payload = (await res.json()) as {
				records: PerformanceAssessmentRecord[];
				pageInfo: PageInfo;
			};
			const nextRecords = Array.isArray(payload.records) ? payload.records : [];
			records = nextRecords;
			pageInfo = payload.pageInfo ?? {
				count: nextRecords.length,
				hasNext: false,
				hasPrev: false,
				nextToken: null,
				prevToken: null,
			};
			if (selectedId && !nextRecords.some((record) => record.id === selectedId)) {
				selectedId = null;
				detail = null;
				await syncAssessmentId(null);
			}
		} catch (err: unknown) {
			errorMessage =
				err instanceof Error && err.message ? err.message : translate('gps.assessments.listFailed');
		} finally {
			loading = false;
		}
	}

	async function loadDetail(id: string, options?: { updateUrl?: boolean }) {
		if (!orgId) return;
		selectedId = id;
		pendingDetailId = id;
		detailLoading = true;
		detailError = null;
		detail = null;
		csvDownloadUrl = null;
		if (options?.updateUrl !== false) {
			await syncAssessmentId(id);
		}
		try {
			const res = await fetch(
				`/api/gps-conditioning/performance-assessments/${encodeURIComponent(id)}?orgId=${encodeURIComponent(orgId)}`,
			);
			if (!res.ok) {
				if (res.status === 403) {
					throw new Error(translate('gps.assessments.detailNotSupported'));
				}
				throw new Error(await res.text());
			}
			const payload = (await res.json()) as { record: PerformanceAssessmentRecord };
			detail = payload.record;
			if (detail.isFujinoCreated) {
				await loadCsvDownloadLink(id);
			}
		} catch (err: unknown) {
			detailError =
				err instanceof Error && err.message
					? err.message
					: translate('gps.assessments.detailFailed');
		} finally {
			pendingDetailId = null;
			detailLoading = false;
		}
	}

	async function loadCsvDownloadLink(id: string) {
		if (!orgId) return;
		csvLoading = true;
		csvDownloadUrl = null;
		try {
			const res = await fetch(
				`/api/gps-conditioning/performance-assessments/${encodeURIComponent(id)}/csv?orgId=${encodeURIComponent(orgId)}`,
			);
			if (!res.ok) throw new Error(await res.text());
			const payload = (await res.json()) as { url?: string | null };
			csvDownloadUrl = payload.url ?? null;
		} catch {
			csvDownloadUrl = null;
		} finally {
			csvLoading = false;
		}
	}

	async function deleteSelected() {
		if (!orgId || !detail || !detail.isFujinoCreated) return;
		const targetId = detail.id;
		if (!confirm(translate('gps.assessments.deleteConfirm', { name: detail.name }))) return;
		deleting = true;
		detailError = null;
		try {
			await syncAssessmentId(null);
			selectedId = null;
			detail = null;
			pendingDetailId = null;
			const res = await fetch(
				`/api/gps-conditioning/performance-assessments/${encodeURIComponent(targetId)}?orgId=${encodeURIComponent(orgId)}`,
				{ method: 'DELETE' },
			);
			if (!res.ok) throw new Error(await res.text());
			await loadList();
		} catch (err: unknown) {
			detailError =
				err instanceof Error && err.message
					? err.message
					: translate('gps.assessments.deleteFailed');
		} finally {
			deleting = false;
		}
	}

	$effect(() => {
		void loadList();
	});

	$effect(() => {
		const urlId = page.url.searchParams.get('assessmentId');
		if (urlId && urlId !== selectedId) {
			void loadDetail(urlId, { updateUrl: false });
			return;
		}
		if (!urlId && selectedId) {
			selectedId = null;
			detail = null;
			pendingDetailId = null;
		}
	});
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<section class="mx-auto max-w-screen-2xl px-4 py-6 text-slate-900">
	<header class="mb-6 space-y-2">
		<h1 class="text-xl font-semibold">{$t('gps.assessments.title')}</h1>
	</header>

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<button
			type="button"
			class="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
			onclick={() => loadList()}
			disabled={loading}
			aria-label={$t('gps.assessments.refresh')}
		>
			<RefreshCw class="h-4 w-4" aria-hidden="true" />
		</button>
		{#if loading}
			<span class="text-sm text-slate-500">{$t('gps.assessments.loading')}</span>
		{/if}
	</div>

	{#if errorMessage}
		<div class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
			{errorMessage}
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
		<div class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold text-slate-800">{$t('gps.assessments.listTitle')}</h2>

			{#if records.length}
				<ul class="space-y-3">
					{#each records as record (record.id)}
						<li
							class={`rounded-xl border px-4 py-3 transition ${selectedId === record.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}
						>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-[12rem]">
									<p class="text-xs text-slate-500">{record.date}</p>
									<p class="text-base font-semibold text-slate-900">{record.name}</p>
									{#if record.description}
										<p class="mt-1 text-sm text-slate-600">{record.description}</p>
									{/if}
								</div>
								<div class="flex flex-col items-end gap-2 text-right">
									{#if gpsTypeLabel(record.gpsType)}
										<span
											class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
										>
											{gpsTypeLabel(record.gpsType)}
										</span>
									{/if}
									<span class="text-xs text-slate-500">
										{$t('gps.assessments.participantsCount', {
											count: record.participantsCount,
										})}
									</span>
								</div>
							</div>
							<div
								class="mt-3 flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500"
							>
								{#if record.isFujinoCreated}
									<button
										type="button"
										class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
										onclick={() => loadDetail(record.id)}
										disabled={detailLoading && selectedId === record.id}
									>
										{$t('gps.assessments.viewDetail')}
									</button>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-slate-500">{$t('gps.assessments.empty')}</p>
			{/if}

			<div class="mt-4 flex items-center justify-between text-sm text-slate-500">
				<button
					type="button"
					class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
					onclick={() => loadList({ prevToken: pageInfo.prevToken })}
					disabled={loading || !pageInfo.hasPrev}
				>
					{$t('gps.assessments.prev')}
				</button>
				<span>{$t('gps.assessments.count', { count: pageInfo.count })}</span>
				<button
					type="button"
					class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
					onclick={() => loadList({ nextToken: pageInfo.nextToken })}
					disabled={loading || !pageInfo.hasNext}
				>
					{$t('gps.assessments.next')}
				</button>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold text-slate-800">
				{$t('gps.assessments.detailTitle')}
			</h2>

			{#if !selectedId}
				<p class="text-sm text-slate-500">{$t('gps.assessments.selectFromList')}</p>
			{:else if detailLoading || pendingDetailId || !detail || detail.id !== selectedId}
				<p class="text-sm text-slate-500">{$t('gps.assessments.detailLoading')}</p>
			{:else if detailError}
				<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
					{detailError}
				</div>
			{:else if detail}
				<div class="space-y-4 text-sm text-slate-700">
					<div class="space-y-1">
						<p class="text-xs text-slate-500">{$t('gps.assessments.nameLabel')}</p>
						<div class="flex flex-wrap items-center gap-2">
							<p class="text-base font-semibold text-slate-900">{detail.name}</p>
							{#if gpsTypeLabel(detail.gpsType)}
								<span
									class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
								>
									{gpsTypeLabel(detail.gpsType)}
								</span>
							{/if}
						</div>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<p class="text-xs text-slate-500">{$t('gps.assessments.dateLabel')}</p>
							<p>{detail.date}</p>
						</div>
						<div>
							<p class="text-xs text-slate-500">
								{$t('gps.assessments.participantsLabel')}
							</p>
							<p>{detail.participantsCount}</p>
						</div>
						<div>
							<p class="text-xs text-slate-500">{$t('gps.assessments.createdAt')}</p>
							<p>{formatDateTime(detail.createdAt)}</p>
						</div>
						<div>
							<p class="text-xs text-slate-500">{$t('gps.assessments.updatedAt')}</p>
							<p>{formatDateTime(detail.updatedAt)}</p>
						</div>
					</div>

					<div class="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
						<p class="text-xs font-semibold text-blue-600">
							{$t('gps.assessments.teamPoints')}
						</p>
						<p class="mt-2 text-3xl font-semibold text-blue-900">
							{formatScore(calcTeamWorkloadConsumptionPoints(detail.gpsType, detail.participants))}
						</p>
					</div>

					{#if detail.description}
						<div>
							<p class="text-xs text-slate-500">{$t('gps.assessments.descriptionLabel')}</p>
							<p>{detail.description}</p>
						</div>
					{/if}

					<div class="space-y-2">
						<p class="text-xs font-semibold text-slate-500">
							{$t('gps.assessments.participantsTitle')}
						</p>
						{#if detail.participants && detail.participants.length}
							<div class="overflow-hidden rounded-xl border border-slate-200">
								<table class="min-w-full border-collapse text-left text-sm">
									<thead class="bg-slate-50 text-xs text-slate-500">
										<tr>
											<th class="px-3 py-2 font-semibold">
												{$t('gps.assessments.tableName')}
											</th>
											<th class="px-3 py-2 font-semibold">
												{$t('gps.assessments.tableScore')}
											</th>
											<th class="px-3 py-2 font-semibold">
												{$t('gps.assessments.tableStatus')}
											</th>
										</tr>
									</thead>
									<tbody>
										{#each detail.participants as participant (participant.id)}
											<tr class="border-t border-slate-100">
												<td class="px-3 py-2 text-slate-800">{participant.fullName}</td>
												<td class="px-3 py-2 text-slate-700 tabular-nums">
													{formatScore(participant.workloadConsumptionPoints)}
												</td>
												<td class="px-3 py-2 text-xs text-slate-500">
													{participant.skipped
														? $t('gps.assessments.statusSkipped')
														: $t('gps.assessments.statusActive')}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<p class="text-xs text-slate-400">
								{$t('gps.assessments.participantsEmpty')}
							</p>
						{/if}
					</div>

					<div class="flex flex-wrap gap-2 pt-2">
						{#if detail.spreadsheetUrl}
							<a
								href={detail.spreadsheetUrl}
								target="_blank"
								rel="noreferrer"
								class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
							>
								{$t('gps.assessments.spreadsheet')}
							</a>
						{/if}
						{#if csvDownloadUrl}
							<a
								href={csvDownloadUrl}
								target="_blank"
								rel="noreferrer"
								class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
							>
								{$t('gps.assessments.csvDownload')}
							</a>
						{:else if csvLoading}
							<span
								class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400"
							>
								{$t('gps.assessments.csvChecking')}
							</span>
						{/if}
						<button
							type="button"
							class="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
							onclick={deleteSelected}
							disabled={deleting || !detail.isFujinoCreated}
						>
							{deleting ? $t('gps.assessments.deleting') : $t('gps.assessments.delete')}
						</button>
					</div>
				</div>
			{:else}
				<p class="text-sm text-slate-500">{$t('gps.assessments.detailDisplayFailed')}</p>
			{/if}
		</div>
	</div>
</section>
