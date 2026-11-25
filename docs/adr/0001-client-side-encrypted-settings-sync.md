# Settings sync encrypts in the browser with a user-held recovery key

Settings sync stores one remote copy of each account's synced data on potber-api. We encrypt that copy in the browser so that the server and the operator see only ciphertext. Setup generates a random 256-bit AES-GCM key, and the recovery key shown to the user (`potber-sync-v1-…`) is that key itself. Each device remembers a non-extractable device key. Each ciphertext is bound to the account's user ID, so it cannot be replayed into another account. Nobody holds a spare copy of the key, which keeps the operator out of users' data at the cost of recoverability.

Devices merge the decrypted copy field by field: the newer field clock wins, and a tie between clocks is broken by device ID. Writes name the revision they build on. After a revision conflict, the device fetches the newer copy, merges again, and retries once.

## Consequences

- A lost recovery key cannot be restored. Devices that already hold a device key keep syncing, but a new device cannot unlock. The only remedy is to delete the remote copy and set up sync again.
- The envelope version, payload schema version, field names (`settings.*`, `blockedUsers`, `boardFavoriteIds`, `savedPosts`), field clocks, and revisions are compatibility boundaries. Older v1 clients must still read new copies, so the payload keeps fields such as `settings.appsignalErrorReporting` that only those clients need.
- The server cannot validate, migrate, or merge synced data. All validation and merging happens in the client, which treats a decrypted copy as untrusted input.
