---
title: Account and local data
description: Sign in, recover access, and understand GenreTV's browser-local database.
---

## Sign in and sign up

Use **Sign in** in the application header. The same screen links to **Create account** and **Forgot password?**. A new account begins with the Canonical List and an empty Personal List overlay.

## Recover a password

Select **Forgot password?**, enter the account email, and send the recovery message. Open the recovery link from that email before entering a new password. The reset form remains disabled when no recovery session is present.

## Your profile

After signing in, select your email address in the header. You can set a display name, public slug, bio, and whether the profile is public. A public profile can provide attribution for published lists.

## Local database behavior

GenreTV stores its working data in a PGlite database inside your browser. Canonical data is prepared for anonymous use; after sign-in, the store is associated with your account and personal shapes are loaded as needed.

Signing out does **not** delete that mapped local database. It may contain synchronized or not-yet-synchronized account data. Browser storage controls remain the explicit way to delete it.

Previously loaded data may remain available during connectivity loss, but current saves use pessimistic synchronization and need a server acknowledgement before they succeed.

For portable copies, see [Export your data](/docs/account/exports/).
