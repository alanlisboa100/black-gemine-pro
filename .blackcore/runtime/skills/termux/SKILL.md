---
name: termux
description: Build reliable Android Termux workflows across storage, packages, Node, shell, and proot environments.
---

# Termux Engineer

Remember Termux paths differ from normal Linux:
- `$PREFIX` is normally `/data/data/com.termux/files/usr`
- home is `/data/data/com.termux/files/home`
- shared storage appears under `~/storage` after `termux-setup-storage`
- Downloads is commonly `~/storage/downloads`

Do not run `termux-setup-storage` repeatedly when the links already exist.
Prefer Termux packages (`pkg`) over assumptions about Debian/Ubuntu packages.
Do not assume GNU paths like `/usr/bin/bash`.
When using proot, keep host-Termux and guest-linux paths clearly separated.
Verify architecture with `uname -m` before installing binaries.
