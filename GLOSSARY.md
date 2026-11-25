# potber

potber is a mobile-first client for the German internet forum forum.mods.de. Users can read and write in the forum, keep personal collections on their devices, and optionally share their preferences and collections between devices through encrypted settings sync.

## Forum

**Forum**:
forum.mods.de, the community whose content potber displays. potber reads and writes forum content through potber-api.
_Avoid_: board (for the whole forum), site

**Board**:
A section of the forum that contains threads.
_Avoid_: subforum, forum, category

**Board category**:
A named group of boards on the board overview.
_Avoid_: section

**Public Offtopic**:
The board with ID 14, called _pot_ in code and settings. Users can choose it as their landing page.
_Avoid_: offtopic board

**Thread**:
A titled discussion in a board, made of pages of posts.
_Avoid_: topic, discussion

**Global thread**:
A forum-wide thread that the forum lists in board views alongside each board's own threads. Users can hide global threads and announcements in board views.
_Avoid_: pinned thread

**Announcement**:
A thread that the forum marks as an announcement. Like global threads, users can hide announcements in board views.

**Post**:
One contribution to a thread, written by a single user.
_Avoid_: reply, comment, message

**Quote**:
Another post's content embedded in a new post and attributed to its author.

**Private message**:
A message sent between users outside any thread. It is filed as inbound, outbound, or system.
_Avoid_: PM (in prose), DM, mail

**Bookmark**:
The forum's record of a user's reading position in a thread. It counts the posts written after that position.
_Avoid_: favorite, saved thread

**Newsfeed**:
The sidebar summary of bookmarks with new posts and unread private messages.
_Avoid_: notifications, feed

**Landing page**:
The page that opens when the user starts the app: Home, the board overview, or Public Offtopic.
_Avoid_: start page

## Personal collections

**Saved post**:
A post that the user keeps for later. The forum does not know about it.
_Avoid_: bookmarked post, favorite post

**Board favorite**:
A board that the user pins to Home.
_Avoid_: pinned board, starred board

**Blocked user**:
A user whose posts and quotes are hidden until the reader reveals them.
_Avoid_: ignored user, muted user

**Blocklist**:
The set of a user's blocked users.
_Avoid_: ignore list

**Preferences**:
A user's display and behavior choices, such as theme, font size, and landing page. The UI calls them settings.
_Avoid_: options, config

**Synced data**:
A user's preferences, saved posts, board favorites, and blocklist: everything that settings sync can share.
_Avoid_: settings (for the whole set), profile

## Settings sync

**Settings sync**:
An optional, end-to-end encrypted way to share synced data between one user's devices.
_Avoid_: cloud sync, backup

**Remote copy**:
The single encrypted copy of an account's synced data stored on the server.
_Avoid_: backup, server settings, cloud copy

**Revision**:
The version number of a remote copy. Each write names the revision it builds on.

**Revision conflict**:
A rejected write whose named revision is no longer the newest, because another device wrote first.
_Avoid_: sync error, collision

**Recovery key**:
The secret shown once when sync is set up. It decrypts the remote copy on any device, and no one else can restore it.
_Avoid_: password, sync key, passphrase

**Device key**:
The key a device remembers after setup or unlock, so it can sync without the recovery key.
_Avoid_: local key, session key

**Locked device**:
A device whose account has a remote copy but which holds no device key.
_Avoid_: disconnected device

**Unlock**:
Entering the recovery key on a locked device so that it can sync again.
_Avoid_: login, restore

**Unlock source**:
The side that a user chooses when their local data and the remote copy differ during unlock: this device or the remote copy. The chosen side's preferences win, and the collections from both sides are combined.

**Field**:
One synced preference or collection, merged independently of the others.
_Avoid_: key, entry

**Field clock**:
When and on which device a field last changed. During a merge, the newer field clock wins.
_Avoid_: timestamp, version

**Device ID**:
A random, persistent identifier for one browser installation, recorded in field clocks.
_Avoid_: client ID, user agent

**Pending edit**:
A local change to synced data that the remote copy does not yet contain.
_Avoid_: unsaved change, draft
