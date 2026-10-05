const assert = require('node:assert/strict');
const Module = require('node:module');
class Plugin {
    constructor(app) { this.app = app; this.cleanups = []; }
    async loadData() { return { extensions: ['env', 'yaml'], editorWidthPercent: 90 }; }
    async saveData() {}
    register(fn) { this.cleanups.push(fn); }
    registerEvent(ref) { if (ref?.off) this.register(ref.off); }
    registerView(type, factory) { this.viewFactory = factory; this.app.viewFactory = factory; }
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
        this.view = { getViewType: () => state.type };
        this.nativeOpens = []; this.detached = false;
    }
    getViewState() {
        return this.view.getState ? { ...this.state, state: this.view.getState() } : this.state;
    }
    async setViewState(state) {
        this.state = state;
        if (this.app.viewFactory && state.type === 'dev-file-editor-view') {
            if (!this.view.setState) this.makeView();
            await this.view.setState(state.state);
        }
        this.app.workspace.emit?.('layout-change');
    }
    makeView() {
        this.view = this.app.viewFactory(this);
        this.view.editor = { value: '' };
        this.view.refreshHeader = () => {};
        this.view.renderEditor = () => {};
    }
    async loadIfDeferred() {
        if (!this.view.setState && this.app.viewFactory && this.state.type === 'dev-file-editor-view') {
            this.makeView();
            await this.view.setState(this.state.state);
        }
    }
    async openFile(file, openState) { this.nativeOpens.push([file, openState]); return 'native'; }
    detach() {
        this.detached = true;
        void this.view.onClose?.();
        const ws = this.app.workspace;
        ws.leaves = ws.leaves.filter(leaf => leaf !== this);
        if (ws.activeLeaf === this) ws.activeLeaf = ws.leaves[0] || null;
        ws.emit?.('layout-change');
    }
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
function events() {
    const listeners = new Map();
    return {
        on(name, fn) {
            if (!listeners.has(name)) listeners.set(name, new Set());
            listeners.get(name).add(fn);
            return { off: () => listeners.get(name).delete(fn) };
        },
        emit(name, ...args) { for (const fn of listeners.get(name) || []) fn(...args); }
    };
}
function fixture(PluginClass) {
    const callbacks = [];
    global.document = {
        body: {}, documentElement: { style: { setProperty() {}, removeProperty() {} } },
        addEventListener() {}, removeEventListener() {}, querySelectorAll: () => []
    };
    global.MutationObserver = class { observe() {} disconnect() {} };
    const files = new Map(); const writes = [];
    const workspace = {
        ...events(), leaves: [], activeLeaf: null, requestedLeaves: 0, revealed: [], splits: [],
        onLayoutReady(fn) { callbacks.push(fn); },
        getLeaf() { this.requestedLeaves++; throw new Error('Création d’un onglet au démarrage'); },
        getLeavesOfType(type) { return this.leaves.filter(leaf => leaf.getViewState().type === type); },
        iterateAllLeaves(callback) { this.leaves.slice().forEach(callback); },
        setActiveLeaf(leaf) { this.activeLeaf = leaf; this.emit('active-leaf-change', leaf); },
        async revealLeaf(leaf) { await Promise.resolve(); this.revealed.push(leaf); this.setActiveLeaf(leaf); },
        createLeafBySplit(source, direction, before) {
            this.splits.push([source, direction, before]);
            const leaf = new WorkspaceLeaf(app); this.leaves.push(leaf); this.emit('layout-change'); return leaf;
        }
    };
    const app = { workspace, vault: {
        ...events(), getAbstractFileByPath: () => null,
        adapter: {
            stat: async path => files.has(path) ? { type: 'file' } : null,
            read: async path => { assert(files.has(path), path); return files.get(path); },
            write: async (path, value) => { writes.push([path, value]); files.set(path, value); }
        }
    } };
    const plugin = new PluginClass(app);
    async function cleanup() {
        plugin.onunload();
        for (const fn of plugin.cleanups.slice().reverse()) fn();
        if (plugin.envCompanion?.running) await plugin.envCompanion.running;
    }
    function addLeaf(file, type = 'dev-file-editor-view') {
        const leaf = new WorkspaceLeaf(app, { type, state: { file } }); workspace.leaves.push(leaf); return leaf;
    }
    async function settle() { plugin.envCompanion.schedule(); await plugin.envCompanion.run(); }
    return { plugin, workspace, callbacks, app, cleanup, files, writes, addLeaf, settle };
}
module.exports = { variants, fixture, WorkspaceLeaf, TFile };
