<script lang="ts">
	import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	import { auth } from '../../lib/firebase';

	const loginWithGoogle = () => {
		const provider = new GoogleAuthProvider();
		signInWithPopup(auth, provider);
	};
</script>

<div class="flex min-h-screen items-center justify-center bg-white px-4">
	<div class="w-full max-w-sm sm:max-w-md">
		<div
			class="flex flex-col items-center gap-6 rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-xl backdrop-blur sm:p-8"
		>
			<img src="/logo.png" alt="藤野クラウド ロゴ" class="h-24 sm:h-32 md:h-40 lg:h-48" />

			<div class="flex w-full flex-col items-stretch gap-3">
				<button
					type="button"
					class="w-full rounded-lg bg-blue-500 px-4 py-3 text-center text-white transition hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
					onclick={loginWithGoogle}
				>
					Google でログインする
				</button>
				<button
					class="w-full rounded-lg bg-gray-700 px-4 py-3 text-center text-white transition hover:bg-gray-800 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none"
				>
					メール でログインする
				</button>
			</div>

			<!-- <p class="text-center text-xs text-gray-500">
				ログインは Google または メールアドレス で行えます。
			</p> -->
			<p class=" text-xs text-gray-500">
				事前に契約をしているユーザーのみに提供されています。 <br />
				利用規約に同意したことを確認しログインしてください。
			</p>
		</div>

		<div class="mt-4 text-center text-xs text-gray-500">
			© 2025 Hideaki Fujino. All rights reserved.
		</div>
	</div>
</div>
