<script lang="ts">
	import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { goto } from '$app/navigation';

	onMount(async () => {
		if (isSignInWithEmailLink(auth, window.location.href)) {
			// Additional state parameters can also be passed via URL.
			// This can be used to continue the user's intended action before triggering
			// the sign-in operation.
			// Get the email if available. This should be available if the user completes
			// the flow on the same device where they started it.
			let email = window.localStorage.getItem('emailForSignIn');
			if (!email) {
				// User opened the link on a different device. To prevent session fixation
				// attacks, ask the user to provide the associated email again. For example:
				email = window.prompt(
					'ブラウザが変更されました。ログインしようとしたメールアドレスを入力してください。',
				);
			}
			// The client SDK will parse the code from the link for you.

			const result = await signInWithEmailLink(auth, email!, window.location.href);
			const idToken = await result.user.getIdToken();
			await fetch('/api/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken }),
			});

			// Clear email from storage.
			window.localStorage.removeItem('emailForSignIn');
			console.log(result);

			await goto('/_/');

			// .then((result) => {
			// })
			// .catch((error) => {
			// 	// Some error occurred, you can inspect the code: error.code
			// 	// Common errors could be invalid email and invalid or expired OTPs.
			// });
		}
	});
</script>
