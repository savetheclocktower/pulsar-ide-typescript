const { CompositeDisposable } = require('atom');
const Path = require('path');
const {
  AutoLanguageClient,
  CommandExecutionAdapter
} = require('@savetheclocktower/atom-languageclient');

const ROOT = Path.normalize(Path.join(__dirname, '..'));

// The TypeScript server won't suggest any of these kinds of code actions
// unless you specifically ask for them.
const CODE_ACTION_KINDS = [
  'quickfix',
  'refactor',
  'refactor.extract',
  'refactor.inline',
  'refactor.rewrite',
  'source',
  'source.organizeImports',
  'source.fixAll'
];

const DIAGNOSTIC_CODES_IGNORED_IN_JAVASCRIPT = [
  // Warns about usage of `require`.
  "80001",

  // Warns about lack of type files in imports.
  "7016",

  // Warns about "any" type.
  "7006",

  // Warns about declaration emits with private modules?
  "9006"
];

class TypeScriptLanguageClient extends AutoLanguageClient {
  onSpawnError (err) {
    // `atom-languageclient` seems to think it'll be able to detect failed
    // spawns in its `catch` clause. But an ordinary `spawn` that exits with a
    // non-zero code doesn't seem to do the trick, and it's not clear to me how
    // I'm meant to inform the server manager of this failure.
    //
    // Instead, I need to clear this promise from the registry or else it'll
    // hang forever and we'll never be able to restart cleanly.
    this._serverManager._startingServerPromises.clear();

    // If we failed to spawn the server, it's almost certainly related to the
    // Node path or version.
    this.errorNotification = atom.notifications.addError(
      `${this.getPackageName()}: ${this.getServerName()} language server cannot start`,
      {
        description: `Make sure the path to your Node binary is correct and is of version 18 or greater.\n\nIf \`node\` is in your \`PATH\` and Pulsar is not recognizing it, you may set the path to your Node binary in this package’s settings. Consult the README on the settings page for more information.`,
        detail: err.message,
        buttons: [
          {
            text: 'Open Settings',
            onDidClick: () => {
              atom.workspace.open(`atom://config/packages/${this.getPackageName()}`);
            }
          }
        ],
        dismissable: true
      }
    );
  }

  activate (...args) {
    super.activate(...args);
    let packageName = this.getPackageName();
    this.wasError = false;

    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.config.onDidChange(`${this.getPackageName()}.nodeBin`, async () => {
        console.log('Value of nodeBin changed! Restarting servers…');
        // Stop all servers while the user is changing this value.
        this._serverManager.stopListening();
        await this._serverManager.stopAllServers();
        if (this._nodeBinTimeout) {
          clearTimeout(this._nodeBinTimeout);
          this._nodeBinTimeout = null;
        }
        // Attempt to start the server again once the value hasn't changed for
        // 1000ms.
        this._nodeBinTimeout = setTimeout(() => {
          this._serverManager.startListening();
        }, 1000);
      }),

      atom.config.onDidChange(
        `${this.getPackageName()}.codeFormat.formattingRules`,
        () => this.sendConfiguration()
      )
    );

    this.commandDisposable = atom.commands.add(
      'atom-workspace',
      {
        [`${packageName}:start-language-server`]: () => {
          // This command doesn't do anything on its own. Its purpose is to
          // start the language server manually when the user wants to use it
          // for non-TypeScript files.
          //
          // It'd be rude to start the language server 100% of the time, and
          // there's no way to programmatically add to the list of
          // `activationHooks` present in `package.json`, so the compromise
          // option is to provide automatic startup for TypeScript files and
          // ask the user to invoke startup for everything else.
          console.debug(`Starting language server...`);
        },
        [`${packageName}:organize-imports`]: async (event) => {
          let editor = atom.workspace.getActiveTextEditor();
          let connection = await this.getConnectionForEditor(editor);
          if (!connection) {
            event.abortKeyBinding();
            return;
          }

          let path = editor.getPath();
          return await CommandExecutionAdapter.executeCommand(
            connection,
            '_typescript.organizeImports',
            [path]
          );
        }
      }
    );
  }

  destroy (...args) {
    super.destroy(...args);
    this.subscriptions.dispose();
    this.commandDisposable.dispose();
  }

  getGrammarScopes () {
    let packageName = this.getPackageName();
    let includeJs = atom.config.get(
      `${packageName}.includeJavaScript`
    );
    let additionalScopes = atom.config.get(
      `${packageName}.advanced.additionalScopes`
    );
    let scopes = ['source.ts', 'source.tsx'];
    if (includeJs) scopes.push('source.js');
    if (additionalScopes) scopes.push(...additionalScopes);
    return scopes;
  }

  getLanguageName () { return 'TypeScript/JavaScript'; }
  getServerName () { return 'TypeScript Language Server'; }

  getPackageName () {
    return Path.basename(ROOT) ?? 'pulsar-ide-typescript-alpha';
  }

  getKindsForCodeActionRequest (_editor, _range, diagnostics) {
    // If there are any diagnostic messages associated with this position in
    // the editor, don't add any kinds. The only things that should appear in
    // the menu are actions associated with fixing that diagnostic.
    if (diagnostics.length > 0) return [];

    // Otherwise the user has asked for code actions in some other section of
    // the editor that has no diagnostic message. We should present them with
    // all the possible actions they can do on this file.
    return CODE_ACTION_KINDS;
  }

  constructor () {
    super();
  }

  getPathToNode () {
    return atom.config.get(`${this.getPackageName()}.nodeBin`) ?? 'node';
  }

  startServerProcess () {
    let nodeBin = this.getPathToNode();
    // This is the entry point to `typescript-language-server`; since we're
    // making the user bring their own Node, we can't just invoke what's in
    // `.bin/typescript-language-server`.
    //
    // TODO: But we should consider invoking `.bin/typescript-language-server`
    // directly! It might give us most of the upside of bring-your-own-Node
    // without as much hassle for the user.
    let bin = Path.join(ROOT, 'node_modules', 'typescript-language-server', 'lib', 'cli.mjs');

    console.log('Starting bin at path:', bin , 'using node at path:', nodeBin);
    return super.spawn(nodeBin, [bin, "--stdio"], {
			cwd: atom.project.getPaths[0] || __dirname
		});
  }

  _getSettingForScope (scope, key) {
    return atom.config.get(key, { scope: [scope] });
  }

  _constructFormatSettingsForScope(scope) {
    let setting = this._getSettingForScope.bind(this, scope);

    let rules = this._getSettingForScope(
      scope,
      `${this.getPackageName()}.codeFormat.formattingRules`
    );

    return {
      format: {
        indentSize: setting('editor.tabLength'),
        tabSize: setting('editor.tabLength'),
        indentStyle: 'None',
        convertTabsToSpaces: setting('editor.softTabs'),
        ...rules,
        completions: {
          completeFunctionCalls: true // TEMP
        }
      },
      implementationsCodeLens: {
        enabled: true
      },
      referencesCodeLens: {
        enabled: true
      }
    };
  }

  postInitialization (server) {
    // Ordinarily we'll just assume the server started successfully and that it
    // isn't worth informing the user about. But if the server was previously
    // in an error state…
    if (this.errorNotification) {
      // …dismiss that old notification (if it's still present)…
      this.errorNotification.dismiss();
      // …and tell the user that it's been fixed.
      atom.notifications.addSuccess(
        `${this.getPackageName()}: ${this.getServerName()} started`
      );
      this.errorNotification = null;
    }

    this._server = server;

    this.sendConfiguration();
  }

  sendConfiguration() {
    if (!this._server) {
      throw new Error(`No server!`);
    }

    // let ignoredCodes = (atom.config.get(`${this.getPackageName()}.linter.ignoredCodes`) ?? []).map(x => Number(x));
    //
    // ignoredCodes.push(...DIAGNOSTIC_CODES_IGNORED_IN_JAVASCRIPT);

    // Send some base config settings. We do our best to get the user's config
    // for TypeScript files and JavaScript files; if settings vary between
    // (say) `source.ts` and `source.tsx`, then the user is a monster.
    let config = {
      settings: {
        implicitProjectConfiguration: {
          // Let's default to `false` on checking JavaScript files. A user can
          // override this with a `jsconfig.json` file, or we could decide to
          // make this a setting.
          checkJs: false
        },
        diagnostics: {
          ignoredCodes
        },
        typescript: this._constructFormatSettingsForScope('source.ts'),
        javascript: this._constructFormatSettingsForScope('source.js')
      }
    };

    console.debug(`Sending configuration:`, config);
    this._server.connection.didChangeConfiguration(config);
  }

  editorIsJavaScript(editor) {
    if (!editor) return false;
    let grammar = editor.getGrammar();
    return (/\.jsx?/).test(grammar.scopeName);
  }

  // Look up scope-specific settings for a particular editor. If `editor` is
  // `undefined`, it'll return general settings for the same key.
  getScopedSettingsForKey (key, editor) {
    let schema = atom.config.getSchema(key);
    if (!schema) throw new Error(`Unknown config key: ${schema}`);

    let base = atom.config.get(key);
    if (!editor) return base;

    let grammar = editor.getGrammar();
    let scoped = atom.config.get(key, { scope: [grammar.scopeName] });

    if (schema?.type === 'object') {
      return { ...base, ...scoped };
    } else {
      return scoped ?? base;
    }
  }

  // AUTOCOMPLETE
  // ============

  provideAutocomplete (...args) {
    // Allow the user to configure whether autocomplete is enabled. Unlike most
    // other such settings, this one requires a restart/reload to apply, and
    // isn't scope-specific.
    let enabled = atom.config.get(`${this.getPackageName()}.autocomplete.enable`);
    if (!enabled) return;

    return super.provideAutocomplete(...args);
  }

  // LINTER
  // ======

  getLinterSettings (editor) {
    return this.getScopedSettingsForKey(`${this.getPackageName()}.linter`, editor);
  }

  shouldIgnoreMessage (diagnostic, editor, _range) {
    // This lets us set a scope-specific override to the `enable` setting. It
    // also saves the user from having to restart before changing this setting
    // takes effect.
    let settings = this.getLinterSettings(editor);
    if (!settings.enable) return true;

    let isModified = editor.getBuffer().isModified();
    let code = diagnostic.code ? String(diagnostic.code) : null;
    if (!code) return false;

    let ignoredCodes = [...settings.ignoredCodes];
    let ignoredCodesWhenBufferIsModified = [...settings.ignoredCodesWhenBufferIsModified];
    if (ignoredCodes.includes(code)) return true;
    if (isModified && ignoredCodesWhenBufferIsModified.includes(code))
      return true;

    if (this.editorIsJavaScript(editor)) {
      if (DIAGNOSTIC_CODES_IGNORED_IN_JAVASCRIPT.includes(code)) {
        return true;
      }
    }

    return false;
  }

  transformMessage (message, diagnostic, editor) {
    let settings = this.getLinterSettings(editor);
    let { code } = diagnostic;
    if (code && settings.includeMessageCodeInMessageBody) {
      message.excerpt = `${message.excerpt} (${diagnostic.code})`;
    }
  }

  // SYMBOLS
  // =======

  getSymbolSettings (editor) {
    return this.getScopedSettingsForKey(`${this.getPackageName()}.symbols`, editor);
  }

  canProvideSymbols (meta) {
    let { editor, type } = meta;
    let settings = this.getSymbolSettings(editor);
    if (!settings.enable) return false;
    // Allow the user to toggle file symbols and project symbols independently.
    // (Maybe they like Tree-sitter symbols better for files, but want to keep
    // the project-wide symbol search.)
    if (type === 'file' && !settings.enableForFileSymbols) {
      return false;
    } else if (type !== 'file' && !settings.enableForProjectSymbols) {
      return false;
    }
    return true;
  }

  shouldIgnoreSymbol (symbol, editor) {
    let { ignoredTags } = this.getSymbolSettings(editor);
    return ignoredTags.includes(symbol.tag);
  }

  minimumQueryLengthForSymbolSearch (meta) {
    let { minimumQueryLength = 3 } = this.getSymbolSettings(meta.editor);
    return minimumQueryLength;
  }


  // INTENTIONS
  // ==========

  ignoreDiagnosticCode(code, { onlyUntilSave = false } = {}) {
    let packageName = this.getPackageName();
    const IGNORED_CODES_NAME = `${packageName}.linter.ignoredCodes`;
    const IGNORED_UNTIL_SAVE_NAME = `${packageName}.linter.ignoredCodesWhenBufferIsModified`;

    let ignoredCodes = atom.config.get(IGNORED_CODES_NAME);
    let ignoredUntilSave = atom.config.get(IGNORED_UNTIL_SAVE_NAME);

    let destination = onlyUntilSave ? ignoredUntilSave : ignoredCodes;
    let other = onlyUntilSave ? ignoredCodes : ignoredUntilSave;

    code = String(code);

    if (other.includes(code)) {
      let index = other.indexOf(code);
      other.splice(index, 1);
    }
    if (!destination.includes(code)) {
      destination.push(code);
    }

    atom.config.set(IGNORED_UNTIL_SAVE_NAME, ignoredUntilSave);
    atom.config.set(IGNORED_CODES_NAME, ignoredCodes);

  }

  getIgnoredCodes(editor) {
    let {
      ignoredCodes = [],
      ignoredCodesWhenBufferIsModified = []
    } = this.getLinterSettings(editor);
    return { ignoredCodes, ignoredCodesWhenBufferIsModified };
  }

  setIgnoredCodes({ ignoredCodes, ignoredCodesWhenBufferIsModified }) {
    let packageName = this.getPackageName();
    const IGNORED_CODES_NAME = `${packageName}.linter.ignoredCodes`;
    const IGNORED_UNTIL_SAVE_NAME = `${packageName}.linter.ignoredCodesWhenBufferIsModified`;
    if (ignoredCodes) {
      atom.config.set(IGNORED_CODES_NAME, ignoredCodes);
    }
    if (ignoredCodesWhenBufferIsModified) {
      atom.config.set(IGNORED_UNTIL_SAVE_NAME, ignoredCodesWhenBufferIsModified);
    }
  }

  // This is annoying because it should be almost entirely a package-specific
  // concern. But `atom-languageclient` must be aware of this because there's
  // no concept of a “code” or “message type” in the `linter` service contract.
  // So we can't pull this off just by inspecting the linter messages; we have
  // to look at the original `Diagnostic` objects from the language server.
  getIntentionsForLinterMessage({ code, callback }, editor) {
    let intentions = [];
    let {
      ignoredCodes = [],
      ignoredCodesWhenBufferIsModified = []
    } = this.getIgnoredCodes(editor);

    // What are the existing ignore settings for this kind of message?
    let isAlwaysIgnored = ignoredCodes.includes(code);
    let isIgnoredUntilSave = ignoredCodesWhenBufferIsModified.includes(code);

    if (!isAlwaysIgnored) {
      intentions.push({
        priority: 1,
        icon: 'mute',
        title: `Always ignore this type of message (${code})`,
        selected: () => {
          this.ignoreDiagnosticCode(code);
          callback();
        }
      });
    }

    if (!isIgnoredUntilSave) {
      intentions.push({
        priority: 1,
        icon: 'mute',
        title: `Always ignore this type of message until save (${code})`,
        selected: () => {
          this.ignoreDiagnosticCode(code, { onlyUntilSave: true });
          callback();
        }
      });
    }

    return intentions;
  }

  // CODE FORMATTING
  // ===============

  provideRangeCodeFormat(...args) {
    // Allow the user to configure whether code formatting is enabled. Unlike
    // most other such settings, this one requires a restart/reload to apply,
    // and isn't scope-specific.
    //
    // TODO: This can be made scope-specific if we just hot-swap in an inert
    // code formatter that makes no suggestions. Revisit this.
    let enabled = atom.config.get(`${this.getPackageName()}.codeFormat.enable`);
    if (!enabled) return;
    return super.provideRangeCodeFormat(...args);
  }

  provideFileCodeFormat(...args) {
    // Allow the user to configure whether code formatting is enabled. Unlike
    // most other such settings, this one requires a restart/reload to apply,
    // and isn't scope-specific.
    //
    // TODO: This can be made scope-specific if we just hot-swap in an inert
    // code formatter that makes no suggestions. Revisit this.
    let enabled = atom.config.get(`${this.getPackageName()}.codeFormat.enable`);
    if (!enabled) return;
    return super.provideFileCodeFormat(...args);
  }

  provideOnSaveCodeFormat(...args) {
    // Allow the user to configure whether code formatting is enabled. Unlike
    // most other such settings, this one requires a restart/reload to apply,
    // and isn't scope-specific.
    //
    // TODO: This can be made scope-specific if we just hot-swap in an inert
    // code formatter that makes no suggestions. Revisit this.
    let enabled = atom.config.get(`${this.getPackageName()}.codeFormat.enable`);

    // TODO: It would be nice to give granular control over which
    // code-formatter kinds are disabled and which aren't. That would let
    // someone disable implicit format-on-save behavior while still being able
    // to reformat a range they'd selected.
    //
    // But `atom-ide-code-format` will try to cross over and use whichever ones
    // are available — e.g., a range formatter (applied over the entire file)
    // if a file formatter is not available — so this isn't practical.
    if (!enabled) return;
    return super.provideOnSaveCodeFormat(...args);
  }

  provideOnTypeCodeFormat(...args) {
    // Allow the user to configure whether code formatting is enabled. Unlike
    // most other such settings, this one requires a restart/reload to apply,
    // and isn't scope-specific.
    //
    // TODO: This can be made scope-specific if we just hot-swap in an inert
    // code formatter that makes no suggestions. Revisit this.
    let enabled = atom.config.get(`${this.getPackageName()}.codeFormat.enable`);
    if (!enabled) return;
    return super.provideOnTypeCodeFormat(...args);
  }
}

module.exports = new TypeScriptLanguageClient();
