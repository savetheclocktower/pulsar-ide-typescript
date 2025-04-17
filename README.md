# pulsar-ide-typescript

An IDE provider package for TypeScript and JavaScript.

Uses its own copy of [typescript-language-server](https://www.npmjs.com/package/typescript-language-server); **you do not need to install your own**.

---

## IMPORTANT: New setting for v0.1.0 and above

This package used to use Pulsar’s built-in version of Node to run [typescript-language-server](https://www.npmjs.com/package/typescript-language-server), but recent versions of the language server require Node 18 or above, and Pulsar is stuck on version 14 until it can upgrade its underlying Electron version.

The solution is to supply your own version of Node so that `typescript-language-server` can run using the more modern version your project is probably already using. This is more hygienic anyway, and it’s only slightly more of a hassle.

### How does it work?

* If you don’t have Node installed on your system, or if your installed version is too old, you have [many options for installing the latest version of Node](https://nodejs.org/en/download/).

* The “Path to Node” setting (or `pulsar-ide-typescript.nodeBin`) is what will run the built-in `typescript-language-server`. If you typically launch Pulsar from the command line, the default value of `node` will almost surely work. Since Pulsar inherits your shell environment, this will usually resolve to the version of Node that would run if you typed `node` from whatever directory you used to launch Pulsar from the command line.

    This is likely to work even with tools like [asdf](https://asdf-vm.com/) and [volta](https://volta.sh/) that use “shims” to manage multiple versions of Node.

    Even if you launch Pulsar another way, it’s pretty good at recreating your default shell environment, including your `PATH`. So it’s still worth trying the default value just to see if it works.

* If it doesn’t work, you’ll see an error notification explaining that the language server failed to launch. You can open the package settings and supply a full, absolute path to a Node binary of version 18 or greater; you’ll know you’ve entered it properly when the error notification is replaced with a success notification.

* If you want to specify different Node paths for different projects, consider [project-config](https://web.pulsar-edit.dev/packages/project-config) or [atomic-management](https://web.pulsar-edit.dev/packages/atomic-management); either will allow you to set config values of `pulsar-ide-typescript.nodeBin` on a per-project basis. (Even this might be overkill, though. As long as you point it to a compatible version of Node, you should easily be able to use that version everywhere, even if it doesn’t always match your project’s version.)

### What if I use an older version of Node or TypeScript in my project?

You don’t need to upgrade the version of Node you use in your project; you just need one version of Node that can run the latest `typescript-language-server`. So in the short term, the solution might be to install a newer version of Node using a tool like [nvm](https://github.com/nvm-sh/nvm/blob/master/README.md) or [asdf](https://asdf-vm.com/). You can then configure this package to use this newer version of Node _instead of_ inheriting the version of Node used in your shell environment.

`typescript-language-server` is theoretically backwards-compatible, as I understand it, so this should work fine. If it doesn’t, then please [file an issue against the package](https://github.com/savetheclocktower/pulsar-ide-typescript/issues) and let me know. It might be worth it in the future to let the user opt into bringing their own version of `typescript-language-server` so that such projects can keep using a known older version of the language server instead of needing to stay on an older version of this package.

---

## What does this package do?

The interaction between Pulsar, IDE provider packages, and IDE consumer packages is hard to explain succinctly, but I’ll give it a try:

* _IDE features_ are things that typically don’t work without something that can analyze the language you’re working in: autocompletion, refactoring, identifying important symbols, et cetera.
* IDE “provider” packages (like this one) can perform that analysis; they act as the “brain” behind a bunch of UI features.
* A couple of these features can be supplied by Pulsar itself. The rest are implemented in popular community packages like the ones listed below.
* The user can pick and choose among those packages. If you want a maximal experience, you can install a whole slate of packages. If you want only a few features, you can pick only the packages you want, and uninstall or disable the ones you don’t.
* Provider packages **should not care** whether a consumer package is installed for a given service, nor should it mandate that any package be installed at all.

IDE features are great when they make you feel productive, but bad when they get in your way. Because the line between “useful” and “invasive” will vary per person, we want to provide an IDE experience that is, above all, customizable.

## What can it do that similar packages can’t?

The formerly first-party [`ide-typescript` package](https://web.pulsar-edit.dev/packages/ide-typescript) is great, but can’t do quite as much as this package can.

### Symbol navigation

This package integrates with recent versions of Pulsar’s built-in `symbols-view` package.

You can view a comprehensive list of file symbols with <kbd>Ctrl-R</kbd>/<kbd>Cmd-R</kbd>:

<p><img width="632" alt="file-symbols" src="https://github.com/savetheclocktower/pulsar-ide-typescript/assets/3450/6b07688b-b1f7-48bd-86ae-d3105eb213f9"></p>

Or search the entire project for symbols via <kbd>Ctrl-Shift-R</kbd>/<kbd>Cmd-Shift-R</kbd>:

<p><img width="660" alt="project-wide-symbols" src="https://github.com/savetheclocktower/pulsar-ide-typescript/assets/3450/90b76096-1562-4f78-8f1a-59b00b1375c2"></p>

Or use <kbd>Ctrl-Alt-Shift-Down</kbd>/<kbd>Cmd-Opt-Down</kbd> to jump to the definition of the symbol under the cursor — even if it’s in another file — then use <kbd>Ctrl-Alt-Shift-Up</kbd>/<kbd>Cmd-Opt-Up</kbd> to return to your original cursor position:

![jump-to-definition](https://github.com/savetheclocktower/pulsar-ide-typescript/assets/3450/c2158087-084a-4bda-999e-99b39fb403af)

### Code actions

This package integrates with the popular `intentions` package to give you a simple menu you can invoke to run code actions or suggested diagnostic fixes.

### Ability to ignore certain diagnostic messages

This package allows you to ignore certain kinds of diagnostic messages. You can choose whether to ignore them altogether or just until the file is saved:

<p><img width="667" alt="intentions" src="https://github.com/savetheclocktower/pulsar-ide-typescript/assets/3450/a89ec391-dac7-463c-8036-9742f5a28c3c"></p>

The latter is useful for annoying messages that point out “problems” in your code that you simply haven’t had a chance to fix yet because you’re _literally still typing_.

Diagnostic messages require the community `linter` package. The menu shown in the screenshot above is implemented by the community `intentions` package.

### Support for refactoring

You can place the cursor inside of any token and invoke a command to rename it. This package will be able to tell Pulsar which other usages of that symbol need to be renamed as well.

This feature requires the community `pulsar-refactor` package.

### Optional JavaScript support

Like `ide-typescript`, this package can be configured to start a language server for JavaScript-only projects. Enable the **Include JavaScript** setting in this package’s settings menu. No separate package is required.

A smaller feature set is available inside of JavaScript projects; autocompletion and symbol providers are sparser with their suggestions, and features like refactoring may not be available at all. Still, you’ll probably be impressed with what it can do.

## What _exactly_ does it do?

Install this package, then install any of the following packages to get special features.

Start with these packages; they’re all builtin, actively maintained, and/or built exclusively for Pulsar:

* [autocomplete-plus](https://web.pulsar-edit.dev/packages/autocomplete-plus) (builtin)
  * See autocompletion options as you type
* [symbols-view](https://web.pulsar-edit.dev/packages/symbols-view) (builtin)
  * View and filter a list of symbols in the current file
  * View and filter a list of symbols across all files in the project
  * Jump to the definition of the symbol under the cursor
* [linter](https://web.pulsar-edit.dev/packages/linter) and [linter-ui-default](https://web.pulsar-edit.dev/packages/linter-ui-default)
  * View diagnostic messages as you type
* [intentions](https://web.pulsar-edit.dev/packages/intentions)
  * Open a menu to view possible code actions for a diagnostic message
  * Open a menu to view possible code actions for the file at large
* [pulsar-find-references](https://web.pulsar-edit.dev/packages/pulsar-find-references)
  * Place the cursor inside of a token to highlight other usages of that token
  * Place the cursor inside of a token, then view a `find-and-replace`-style “results” panel containing all usages of that token across your project
* [pulsar-outline-view](https://web.pulsar-edit.dev/packages/pulsar-outline-view)
  * View a hierarchical list of the file’s symbols
* [pulsar-refactor](https://web.pulsar-edit.dev/packages/pulsar-refactor)
  * Perform project-wide renaming of variables, methods, classes and types

For other features that don’t have equivalents above, the legacy `atom-ide` packages should also work:

* [atom-ide-outline](https://web.pulsar-edit.dev/packages/atom-ide-outline)
  * View a hierarchical list of the file’s symbols
  * View the call hierarchy for a given file
* [atom-ide-datatip](https://web.pulsar-edit.dev/packages/atom-ide-datatip)
  * Hover over a symbol to see any related documentation, including method signatures
* [atom-ide-signature-help](https://web.pulsar-edit.dev/packages/atom-ide-signature-help)
  * View a function’s parameter signature as you type its arguments
* [atom-ide-code-format](https://web.pulsar-edit.dev/packages/atom-ide-code-format)
  * Invoke on a buffer (or a subset of your buffer) to reformat your code according to the language server’s settings
* [atom-ide-definitions](https://web.pulsar-edit.dev/packages/atom-ide-definitions)
  * Jump to the definition of the symbol under the cursor
