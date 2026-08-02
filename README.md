# pulsar-ide-typescript

An IDE provider package for TypeScript and JavaScript.

Provides autocompletion, go-to-definition, and other useful features; consider installing some IDE consumer packages to enjoy more features.

Uses its own copy of [typescript-language-server](https://www.npmjs.com/package/typescript-language-server); **you do not need to install your own**.

## Node: use bundled version or bring your own

On Pulsar v1.131.0 and greater, `pulsar-ide-typescript` is able to use Pulsar’s own embedded Node to run `typescript-language-server`. If you would prefer to bring your own Node, you can uncheck “Use Built-in Node” in the package settings and specify the path to your own version of Node.

If you specify a custom Node, please ensure it is of **version 20 or greater**.

### Use bundled version

This setting is enabled by default and will work for the vast majority of users.

### Bring your own

This setting is for those who want precise control over the Node version used — for instance, if they want to ensure alignment with the Node version that their project users.

The “Path to Node” setting (or `pulsar-ide-typescript.nodeBin`) is what will run the built-in `typescript-language-server`. If you typically launch Pulsar from the command line, the default value of `node` will almost surely work. Since Pulsar inherits your shell environment, this will usually resolve to the version of Node that would run if you typed `node` from whatever directory you used to launch Pulsar from the command line.

This is likely to work even with tools like [asdf](https://asdf-vm.com/) and [volta](https://volta.sh/) that use “shims” to manage multiple versions of Node.

Even if you launch Pulsar another way, it’s pretty good at recreating your default shell environment, including your `PATH`. So it’s still worth trying the default value just to see if it works.

If it doesn’t work, you’ll see an error notification explaining that the language server failed to launch. You can open the package settings and supply a full, absolute path to a Node binary of version 20 or greater; you’ll know you’ve entered it properly when the error notification is replaced with a success notification.

## What does this package do?

An “IDE provider package” is a package that knows how to talk to a _language server_. A language server is a program that can analyze a project written in a specific programming language and act as a “brain” for a bunch of features that would be useful for a code editor.

The Pulsar documentation has [more information about language servers](https://docs.pulsar-edit.dev/ide-features/getting-started/#what-are-language-servers%253F) if you’re curious.

This package knows how to talk to `typescript-language-server`, a package that wraps the `tsserver` program that comes with TypeScript. `tsserver` has its own protocol (it predates the invention of the language server protocol), so `typescript-language-server` exists as a translator to LSP concepts.

(TypeScript 7 offers its own native language server, and this package will eventually offer it as an option to use instead of `typescript-language-server`, but probably not until at least the 7.1 release.)

## What can it do that similar packages can’t?

The formerly first-party [`ide-typescript` package](https://web.pulsar-edit.dev/packages/ide-typescript) is great, but can’t do quite as much as this package can.

Here are some advantages of `pulsar-ide-typescript` over `ide-typescript`:

* Actively maintained and keeps up with `typescript-language-server` releases.
* Integrates with the built-in `symbols-view` package to provide jump-to-definition functionality.
* Adds ability to invoke code actions via the popular [`intentions`](https://packages.pulsar-edit.dev/packages/intentions) community package.
* Adds ability to ignore certain diagnostic messages — either altogether or while the document is in a modified state — via a code action.
* Adds support for refactoring (project-wide renaming of functions or other symbols) via a package like [`pulsar-refactor`](https://packages.pulsar-edit.dev/packages/pulsar-refactor).
* Automatically filters out diagnostic messages that are not relevant inside JavaScript projects.

### Optional JavaScript support

Like `ide-typescript`, this package can be configured to start a language server for JavaScript-only projects. Enable the **Include JavaScript** setting in this package’s settings menu. No separate package is required.

A smaller feature set is available inside of JavaScript projects; autocompletion and symbol providers are sparser with their suggestions, and features like refactoring may not be available at all. Still, you’ll probably be impressed with what it can do.

### Ability to add type definitions for `init.js`

`pulsar-ide-typescript` can give you API autocompletion and documentation for the Pulsar API. This API is available to you within [your `init.js` file](https://docs.pulsar-edit.dev/customizing-pulsar/the-init-file/) to help you customize Pulsar; it consists of a number of methods defined on the `atom` global object, along with classes you can import via `require('atom')`.

Upon first run, this package will offer to define a `jsconfig.json` file in your `ATOM_HOME` to make this possible. This file tells the language server to make the Pulsar API type definitions ambiently available within `init.js`. It affects only that specific file and will not interfere with anything else.

This is a one-time prompt unless you snooze it. If you choose “yes” or “no” to this prompt, this package will not ask again. If you choose “later” or close the prompt, you will be asked again upon the next launch of Pulsar or the next opening of a project window.

If you said “no” to this and want to change your mind, open the **Advanced** section of this package’s settings and check the option “Prompt about jsconfig.json in your ATOM_HOME directory.” The prompt will be shown again upon the next launch of Pulsar or the next opening of a project window.

(Even without a `jsconfig.json` in your `ATOM_HOME` directory, you may still find that this package is able to provide type definitions for Pulsar. That’s because `typescript-language-server` has a global types cache. If you have _any_ project in which you’ve imported `@pulsar-edit/types` or `@types/atom`, there’s a good chance that `typescript-language-server` will be able to use the types it cached from that project.)

## What other packages should I install?

This package provides only the “brain” for a bunch of TypeScript- and JavaScript-related features. The actual implementations of those features come from packages — some of which are built into Pulsar and some of which need installation.

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
* [pulsar-code-format](https://packages.pulsar-edit.dev/packages/pulsar-code-format)
  * Format code automatically on save
  * Format the selected range of a buffer
  * Format the entire buffer
* [pulsar-hover](https://packages.pulsar-edit.dev/packages/pulsar-hover)
  * Hover over a symbol to see a tooltip documenting it (or disable this behavior and use a key binding to show the tooltip)
  * Receive “signature help” when specifying the arguments to a function

Older packages (mainly beginning with `atom-ide-`) can deliver similar features, but the packages above were largely built specifically for Pulsar.
