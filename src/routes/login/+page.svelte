<script lang="ts">
	import {
		GoogleAuthProvider,
		onAuthStateChanged,
		sendSignInLinkToEmail,
		signInWithPopup,
	} from 'firebase/auth';
	import { auth } from '$lib/firebase';
	import { onMount } from 'svelte';

	const loginWithGoogle = () => {
		const provider = new GoogleAuthProvider();
		signInWithPopup(auth, provider);
	};

	// --- Email login UI state ---
	let showEmail = false;
	let email = '';
	let sending = false;
	let message: string | null = null;
	let error: string | null = null;

	async function sendLoginLink(to: string) {
		const url = `${window.location.origin}/login/email-callback`; // ✅ dynamically uses current host
		const result = await sendSignInLinkToEmail(auth, to, {
			url,
			handleCodeInApp: true,
		});
		console.log('Login link sent to:', to, 'redirect URL:', url);
		window.localStorage.setItem('emailForSignIn', to);

		return result;
	}

	async function onEmailSubmit() {
		error = null;
		message = null;
		if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
			error = '有効なメールアドレスを入力してください。';
			return;
		}
		sending = true;
		try {
			await sendLoginLink(email);
			message = 'ログインリンクを送信しました。メールをご確認ください。';
		} catch (e: any) {
			error = e?.message ?? 'リンク送信に失敗しました。';
		} finally {
			sending = false;
		}
	}

	function cancelEmail() {
		showEmail = false;
		email = '';
		error = null;
		message = null;
	}

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				console.log('✅ Logged in as:', user.email);
				// --------------------------------------------------
				// PLACEHOLDER: You can write what to do after login
				// e.g. navigate('/dashboard'), call backend, etc.
				// --------------------------------------------------
			} else {
				console.log('🚪 User logged out or not authenticated');
				// --------------------------------------------------
				// PLACEHOLDER: You can write what to do after logout
				// e.g. show login screen, clear session, etc.
				// --------------------------------------------------
			}
		});

		// ✅ Cleanup on unmount
		return () => unsubscribe();
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-white px-4">
	<div class="w-full max-w-sm sm:max-w-md">
		<div
			class="flex flex-col items-center gap-6 rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-xl backdrop-blur sm:p-8"
		>
			<img src="/logo.png" alt="藤野クラウド ロゴ" class="h-24 sm:h-32 md:h-40 lg:h-48" />

			<div class="flex w-full flex-col items-stretch gap-3">
				<!-- Google -->
				<button
					type="button"
					class="w-full rounded-lg bg-blue-500 px-4 py-3 text-center text-white transition hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
					onclick={loginWithGoogle}
					disabled={sending}
				>
					Google でログインする
				</button>

				<!-- Either "メールでログインする" OR email form -->
				{#if !showEmail}
					<button
						type="button"
						class="w-full rounded-lg bg-gray-700 px-4 py-3 text-center text-white transition hover:bg-gray-800 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none"
						onclick={() => (showEmail = true)}
						disabled={sending}
					>
						メール でログインする
					</button>
				{:else}
					<form class="flex w-full flex-col items-stretch gap-3" onsubmit={onEmailSubmit}>
						<input
							type="email"
							class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-gray-300 focus:outline-none"
							placeholder="your@email.com"
							bind:value={email}
						/>

						<div class="flex gap-2">
							<button
								type="button"
								class="w-1/2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-gray-700 transition hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 focus:outline-none"
								onclick={cancelEmail}
								disabled={sending}
							>
								キャンセル
							</button>
							<button
								type="submit"
								class="w-1/2 rounded-lg bg-gray-700 px-4 py-3 text-center text-white transition hover:bg-gray-800 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
								disabled={sending}
							>
								{#if sending}
									<svg
										class="mr-2 inline h-4 w-4 animate-spin"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
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
									送信中…
								{:else}
									メールでログイン
								{/if}
							</button>
						</div>

						{#if error}
							<p class="text-center text-sm text-red-600">{error}</p>
						{/if}
						{#if message}
							<p class="text-center text-sm text-green-600">{message}</p>
						{/if}
					</form>
				{/if}
			</div>

			<p class="text-center text-xs text-gray-500">
				事前に契約をしているユーザーのみに提供されています。<br />
				利用規約に同意したことを確認しログインしてください。
			</p>
		</div>

		<div class="mt-4 text-center text-xs text-gray-500">
			© 2025 Hideaki Fujino. All rights reserved.
		</div>
	</div>
</div>
