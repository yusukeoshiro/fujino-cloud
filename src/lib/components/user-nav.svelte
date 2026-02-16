<script lang="ts">
	import {
		Avatar,
		AvatarFallback,
		AvatarImage,
	} from "$lib/components/ui/avatar";
	import { Button } from "$lib/components/ui/button";
	import * as Popover from "$lib/components/ui/popover";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { currentUser } from "$lib/current-user";
	import { auth } from "$lib/firebase";
	import { t, locale, setLocale, supportedLocales, type Locale } from "$lib/i18n";
	import { signOut, updateProfile, updateEmail } from "firebase/auth";
	import { goto } from "$app/navigation";
	import { tick } from "svelte";
	import { cn } from "$lib/utils";

	let showProfile = $state(false);
	// Profile editing state
	let profileName = $state("");
	let profileEmail = $state("");
	let profileSaving = $state(false);
	let profileNotice = $state<{ tone: "success" | "error"; text: string } | null>(
		null
	);
	let isOpen = $state(false);

	// Sync draft with current user
	const syncProfileDraft = () => {
		if (!$currentUser) return;
		profileName = $currentUser.displayName ?? "";
		profileEmail = $currentUser.email ?? "";
	};

	$effect(() => {
		if (isOpen && $currentUser) {
			syncProfileDraft();
		}
	});

	const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

	const saveProfile = async () => {
		if (!$currentUser) return;
		profileNotice = null;
		const nextName = profileName.trim();
		const nextEmail = profileEmail.trim();
		if (!nextEmail || !isValidEmail(nextEmail)) {
			profileNotice = { tone: "error", text: $t("profile.emailInvalid") };
			return;
		}
		const tasks: Promise<void>[] = [];
		if (nextName !== ($currentUser.displayName ?? "")) {
			tasks.push(updateProfile($currentUser, { displayName: nextName }));
		}
		if (nextEmail !== ($currentUser.email ?? "")) {
			tasks.push(updateEmail($currentUser, nextEmail));
		}
		if (!tasks.length) {
			profileNotice = { tone: "success", text: $t("profile.noChanges") };
			return;
		}
		profileSaving = true;
		try {
			await Promise.all(tasks);
			if (auth.currentUser) {
				currentUser.set(auth.currentUser);
			}
			profileNotice = { tone: "success", text: $t("profile.updateSuccess") };
		} catch (error) {
			const code = (error as { code?: string }).code;
			profileNotice = {
				tone: "error",
				text:
					code === "auth/requires-recent-login"
						? $t("profile.reauthRequired")
						: $t("profile.updateFailed"),
			};
			syncProfileDraft();
		} finally {
			profileSaving = false;
		}
	};

	const logout = async () => {
		try {
			await signOut(auth);
			console.log("🚪 Logged out");
			await fetch("/api/session", { method: "DELETE" });
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto("/login");
		} catch (err) {
			console.error("Logout failed:", err);
		}
	};
</script>

<Popover.Root bind:open={isOpen}>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button variant="ghost" class="relative h-8 w-8 rounded-full" {...props}>
				<Avatar class="h-8 w-8">
					<AvatarImage src={$currentUser?.photoURL} alt={$currentUser?.displayName ?? "@"} />
					<AvatarFallback>{$currentUser?.displayName?.[0] ?? $currentUser?.email?.[0] ?? "U"}</AvatarFallback>
				</Avatar>
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-80" align="end" preventScroll={false}>
		<div class="flex flex-col space-y-1 mb-4">
			<p class="text-sm font-medium leading-none">{$currentUser?.displayName ?? "User"}</p>
			<p class="text-xs leading-none text-muted-foreground">
				{$currentUser?.email}
			</p>
		</div>

		<!-- Profile Editing Section inside Popover -->
		<div class="space-y-4 pt-4 border-t">
			<div class="space-y-2">
				<Label for="name">{$t("profile.nameLabel")}</Label>
				<Input id="name" bind:value={profileName} />
			</div>
			<div class="space-y-2">
				<Label for="email">{$t("profile.emailLabel")}</Label>
				<Input id="email" bind:value={profileEmail} />
			</div>
			<div class="space-y-2">
				<Label for="language">{$t("profile.languageLabel")}</Label>
				<select
					id="language"
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					value={$locale}
					onchange={(event) => {
						const target = event.currentTarget as HTMLSelectElement;
						setLocale(target.value as Locale);
					}}
				>
					{#each supportedLocales as option (option)}
						<option value={option}>{$t(`settings.language.${option}`)}</option>
					{/each}
				</select>
			</div>

			{#if profileNotice}
				<div
					class={cn(
						"rounded-lg border px-3 py-2 text-xs",
						profileNotice.tone === "success"
							? "border-emerald-200 bg-emerald-50 text-emerald-700"
							: "border-rose-200 bg-rose-50 text-rose-700"
					)}
				>
					{profileNotice.text}
				</div>
			{/if}

			<Button class="w-full" onclick={saveProfile} disabled={profileSaving}>
				{profileSaving ? $t("profile.saving") : $t("profile.save")}
			</Button>
		</div>

		<div class="pt-4 mt-4 border-t">
			<Button
				variant="ghost"
				class="w-full justify-start px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
				onclick={logout}
			>
				{$t("layout.logout")}
			</Button>
		</div>
	</Popover.Content>
</Popover.Root>
