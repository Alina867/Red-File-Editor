const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// API simulée : getLeaf() échoue pour détecter toute création d'onglet au démarrage.
class Plugin {
    constructor(app) { this.app = app; this.cleanups = []; }
    async loadData() { return { extensions: ['env', 'yaml'], editorWidthPercent: 90 }; }
    async saveData() {}
    register(fn) { this.cleanups.push(fn); }
    registerEvent() {}
    registerView(type, factory) { this.viewFactory = factory; }
    registerExtensions() {}
    addSettingTab() {}
    addCommand() {}
    addRibbonIcon() {}
}
class ItemView { constructor(leaf) { this.leaf = leaf; this.app = leaf.app; } }
class TFile { constructor(name) { this.name = name; this.path = name; } }
class WorkspaceLeaf {
    constructor(app, state = { type: 'empty', state: {} }) {
        this.app = app; this.state = state;
        this.view = { getViewType: () => 'empty' };
        this.nativeOpens = []; this.detached = false;
    }
    getViewState() { return this.state; }
    async setViewState(state) { this.state = state; }
    async openFile(file, openState) { this.nativeOpens.push([file, openState]); return 'native'; }
    detach() { this.detached = true; }
}
const obsidian = {
    Plugin, ItemView, TFile, WorkspaceLeaf,
    Notice: class {}, Modal: class {}, Setting: class {}, PluginSettingTab: class {}
};
function loadPlugin(path) {
    const previous = Module._load;
    Module._load = function(name, ...args) {
        return name === 'obsidian' ? obsidian : previous.call(this, name, ...args);
    };
    try { return require(path); } finally { Module._load = previous; }
}
const variants = [['sources', loadPlugin('../src/main.js')], ['main.js compilé', loadPlugin('../main.js')]];

function fixture(PluginClass) {
    const callbacks = [];
    const document = {
        body: {},
        documentElement: { style: { setProperty() {}, removeProperty() {} } },
        addEventListener() {}, removeEventListener() {}, querySelectorAll: () => []
    };
    global.document = document;
    global.MutationObserver = class { observe() {} disconnect() {} };
    const workspace = {
        leaves: [], activeLeaf: null, requestedLeaves: 0, revealed: [],
        on() { return {}; }, onLayoutReady(fn) { callbacks.push(fn); },
        getLeaf() { this.requestedLeaves++; throw new Error('Création d’un onglet au démarrage'); },
        getLeavesOfType(type) { return this.leaves.filter(leaf => leaf.getViewState().type === type); },
        setActiveLeaf(leaf) { this.activeLeaf = leaf; },
        async revealLeaf(leaf) { await Promise.resolve(); this.revealed.push(leaf); this.activeLeaf = leaf; }
    };
    const app = { workspace, vault: { on: () => ({}), getAbstractFileByPath: () => null } };
    const plugin = new PluginClass(app);
    function cleanup() {
        plugin.onunload();
        for (const fn of plugin.cleanups.slice().reverse()) fn();
    }
    return { plugin, workspace, callbacks, app, cleanup };
}

for (const [label, PluginClass] of variants) {
    test(`${label} : démarrage avec fichier restauré, sans création ni activation d’onglet vide`, async t => {
        const f = fixture(PluginClass); t.after(f.cleanup);
        await f.plugin.onload();
        const leaf = new WorkspaceLeaf(f.app, { type: 'dev-file-editor-view', state: { file: '.env' } });
        leaf.view = f.plugin.viewFactory(leaf);
        f.workspace.leaves = [leaf]; f.workspace.activeLeaf = leaf;
        for (const callback of f.callbacks) callback();
        assert.equal(f.workspace.requestedLeaves, 0);
        assert.deepEqual(f.workspace.leaves, [leaf]);
        assert.equal(f.workspace.activeLeaf, leaf);
        assert.equal(leaf.view.navigation, true);
    });

    test(`${label} : installation sans aucun onglet existant`, async t => {
        const f = fixture(PluginClass); t.after(f.cleanup);
        await f.plugin.onload();
        for (const callback of f.callbacks) callback();
        assert.equal(f.workspace.requestedLeaves, 0);
        assert.deepEqual(f.workspace.leaves, []);
        assert.equal(f.workspace.activeLeaf, null);
    });

    test(`${label} : onglet différé réutilisé et révélé sans en créer un autre`, async t => {
        const f = fixture(PluginClass); t.after(f.cleanup);
        const deferred = { getViewState: () => ({ type: 'dev-file-editor-view', state: { file: 'compose.yaml' } }) };
        Object.defineProperty(deferred, 'view', { get() { throw new Error('Vue différée accédée'); } });
        f.workspace.leaves = [deferred];
        await f.plugin.openPathInDevEditor('compose.yaml');
        assert.equal(f.workspace.requestedLeaves, 0);
        assert.equal(f.workspace.activeLeaf, deferred);
        assert.deepEqual(f.workspace.revealed, [deferred]);
    });

    test(`${label} : interception, ouverture native et restauration du prototype`, async t => {
        const f = fixture(PluginClass); t.after(f.cleanup);
        f.plugin.settings = { extensions: ['env', 'yaml'] };
        const original = WorkspaceLeaf.prototype.openFile;
        f.plugin.installDotFileOpenHandler();
        assert.notEqual(WorkspaceLeaf.prototype.openFile, original);
        const leaf = new WorkspaceLeaf(f.app);
        await leaf.openFile(new TFile('.env'));
        assert.deepEqual(leaf.getViewState(), { type: 'dev-file-editor-view', active: true, state: { file: '.env' } });
        const note = new TFile('note.md');
        assert.equal(await leaf.openFile(note, { active: false }), 'native');
        assert.deepEqual(leaf.nativeOpens, [[note, { active: false }]]);
        for (const fn of f.plugin.cleanups.splice(0).reverse()) fn();
        assert.equal(WorkspaceLeaf.prototype.openFile, original);
    });

    test(`${label} : activation compatible avec l’API sans revealLeaf`, async t => {
        const f = fixture(PluginClass); t.after(f.cleanup);
        delete f.workspace.revealLeaf;
        const leaf = new WorkspaceLeaf(f.app);
        await f.plugin.focusDevFileLeaf(leaf);
        assert.equal(f.workspace.activeLeaf, leaf);
    });
}
