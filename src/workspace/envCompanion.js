const { VIEW_TYPE_DEV_FILE } = require("../constants");

// Un seul panneau automatique. Les onglets .env ouverts manuellement restent indépendants.
class EnvCompanion {
    constructor(plugin) {
        this.plugin = plugin;
        this.workspace = plugin.app.workspace;
        this.leaf = null;
        this.source = null;
        this.suppressed = null;
        this.timer = null;
        this.running = null;
        this.dirty = false;
        this.stopped = false;
    }

    leaves() {
        const leaves = [];
        this.workspace.iterateAllLeaves(leaf => leaves.push(leaf));
        return leaves;
    }

    path(leaf) {
        return leaf?.getViewState()?.state?.file || "";
    }

    owns(leaf) {
        const state = leaf?.getViewState();
        return state?.type === VIEW_TYPE_DEV_FILE && state.state?.autoEnvCompanion === true;
    }

    target() {
        const active = this.workspace.activeLeaf;
        const source = active === this.leaf && this.owns(active) ? this.source : active;
        if (!source || !this.leaves().includes(source)) return null;
        const path = this.path(source);
        return /\.(yaml|yml|yam)$/i.test(path) ? { source, path } : null;
    }

    start() {
        // Retrouver le panneau automatique après un redémarrage, sans en dupliquer un.
        this.leaf = this.workspace.getLeavesOfType(VIEW_TYPE_DEV_FILE).find(leaf => this.owns(leaf)) || null;
        if (this.leaf) {
            const sourcePath = this.leaf.getViewState().state.envSourcePath;
            this.source = this.leaves().find(leaf => leaf !== this.leaf && this.path(leaf) === sourcePath) || null;
        }
        for (const name of ["active-leaf-change", "file-open", "layout-change"]) {
            this.plugin.registerEvent(this.workspace.on(name, () => this.schedule()));
        }
        for (const name of ["create", "delete", "rename"]) {
            this.plugin.registerEvent(this.plugin.app.vault.on(name, () => this.schedule()));
        }
        this.schedule();
    }

    schedule() {
        if (this.stopped) return;
        this.dirty = true;
        if (this.running || this.timer) return;
        this.timer = setTimeout(() => {
            this.timer = null;
            void this.run();
        }, 30);
    }

    async run() {
        if (this.running) return this.running;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.running = this.drain();
        try {
            await this.running;
        } finally {
            this.running = null;
            if (this.dirty && !this.stopped) this.schedule();
        }
    }

    async drain() {
        while (this.dirty && !this.stopped) {
            this.dirty = false;
            try {
                await this.sync();
            } catch (error) {
                console.error("[Red File Editor] Suivi du .env :", error);
                await this.close();
            }
        }
    }

    sameTarget(expected) {
        const current = this.target();
        return !this.stopped && this.plugin.settings.autoOpenEnvWithYaml !== false &&
            current?.source === expected.source && current.path === expected.path;
    }

    async sync() {
        if (this.leaf && !this.leaves().includes(this.leaf)) {
            // Respecter une fermeture manuelle jusqu'au prochain changement de YAML.
            this.suppressed = { source: this.source, path: this.leaf.getViewState().state?.envSourcePath };
            this.leaf = null;
        } else if (this.leaf && !this.owns(this.leaf)) {
            // Le panneau a été réutilisé manuellement : ne pas fermer son nouveau fichier.
            this.leaf = null;
        }

        const target = this.target();
        if (this.plugin.settings.autoOpenEnvWithYaml === false || !target) {
            await this.close();
            this.source = null;
            this.suppressed = null;
            return;
        }
        if (this.suppressed?.source === target.source && this.suppressed.path === target.path) return;
        this.suppressed = null;
        this.source = target.source;

        const slash = target.path.lastIndexOf("/");
        const envPath = slash < 0 ? ".env" : `${target.path.slice(0, slash)}/.env`;
        const stat = await this.plugin.app.vault.adapter.stat(envPath);
        // Vérifier à nouveau la sélection après l'accès disque : elle a pu changer.
        if (!this.sameTarget(target)) {
            this.dirty = !this.stopped;
            return;
        }
        if (!stat || stat.type !== "file") {
            await this.close();
            return;
        }

        let leaf = this.leaf;
        if (!leaf) {
            leaf = this.workspace.createLeafBySplit(target.source, "vertical", false);
            this.leaf = leaf;
        }
        const state = leaf.getViewState().state || {};
        if (!this.owns(leaf) || state.file !== envPath || state.envSourcePath !== target.path) {
            await leaf.setViewState({
                type: VIEW_TYPE_DEV_FILE,
                active: false,
                pinned: true,
                state: { file: envPath, autoEnvCompanion: true, envSourcePath: target.path }
            });
        }
        if (typeof leaf.loadIfDeferred === "function") await leaf.loadIfDeferred();
        // Un événement intervenu pendant le chargement sera traité au tour suivant.
        if (!this.sameTarget(target)) this.dirty = !this.stopped;
    }

    async close() {
        const leaf = this.leaf;
        this.leaf = null;
        if (!leaf || !this.leaves().includes(leaf) || !this.owns(leaf)) return;
        // Sauvegarder immédiatement, sans attendre le délai de frappe de l'éditeur.
        if (typeof leaf.view?.saveNow === "function") await leaf.view.saveNow();
        if (this.leaves().includes(leaf) && this.owns(leaf)) leaf.detach();
    }

    stop() {
        this.stopped = true;
        this.dirty = false;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        void this.close().catch(error => console.error("[Red File Editor] Fermeture du .env :", error));
    }
}

module.exports = { EnvCompanion };
