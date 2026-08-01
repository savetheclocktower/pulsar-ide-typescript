# 0.2.1 — 2026-08-01

* Updated to `@savetheclocktower/atom-languageclient` version `1.17.21` in order to accomplish…
  * Fixed an issue where inserting an import (via code action, acceptance of an autocompletion item, or other means) neglected to insert a comma when appropriate.

# 0.2.0 — 2026-02-15

* This package now requires Pulsar v1.131.0 or later.
* Since we now can assume a Node version of >= 20 is bundled with Pulsar, we may once again use the built-in Node to launch `typescript-language-server` instead of forcing the user to bring their own Node version.
  * However, we’ll keep the bring-your-own-Node feature as an opt-in thing, at least for now.
* Users may now specify any of the initialization options [documented here](https://github.com/typescript-language-server/typescript-language-server/blob/master/docs/configuration.md#initializationoptions), including easy customization of `maxTsServerMemory`.
* This package now uses version `5.1.0` of the `autocomplete.provider` service; this enables new fancy autocompletion tricks. For instance: accepting a suggestion for a symbol that isn’t yet imported into the buffer should automatically add the needed `import` statement.

# 0.1.2 — 2024-06-22

* Updated to latest `@savetheclocktower/atom-languageclient` in order to add these features:
  * Usage of `busy-signal` to report server-initiated async task progress
  * Better reporting of client capabilities, plus better interpretation of server capabilities
* Advertised this package as a consumer of `atom-ide-busy-signal` so that both `@savetheclocktower/atom-languageclient` and the underlying language server use it to report async task progress
