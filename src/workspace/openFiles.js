const { TFile, WorkspaceLeaf } = require("obsidian");
const { VIEW_TYPE_DEV_FILE } = require("../constants");
const { isDotFile } = require("../editor/fileTypes");

// Méthodes rattachées au prototype du plugin dans src/main.js.
// `this` désigne toujours la même instance du plugin.
const openFileMethods = {
    async openInDevEditor(
        file,
        leaf = null
    ) {
        if (!(file instanceof TFile)) {
            return;
        }

        await this.openPathInDevEditor(
            file.path,
            leaf
        );
    },


    getOpenDevFileLeaf(path) {
        if (!path) {
            return null;
        }

        const leaves =
            this.app.workspace
                .getLeavesOfType(
                    VIEW_TYPE_DEV_FILE
                );

        return (
            leaves.find(leaf => {
                // Un onglet restauré en arrière-plan peut être une DeferredView.
                // Son état reste disponible même si la vue n'est pas chargée.
                const viewState = leaf.getViewState();

                return (
                    viewState &&
                    viewState.state &&
                    viewState.state.file === path
                );
            }) || null
        );
    },


    async focusDevFileLeaf(leaf) {
        if (!leaf) {
            return;
        }

        if (typeof this.app.workspace.revealLeaf === "function") {
            await this.app.workspace.revealLeaf(leaf);
            return;
        }

        this.app.workspace
            .setActiveLeaf(
                leaf,
                { focus: true }
            );
    },


    async openPathInDevEditor(
        path,
        leaf = null
    ) {
        if (!path) {
            return;
        }

        /*
         * Ne jamais ouvrir deux onglets pour le même fichier.
         * Les vues personnalisées ItemView ne sont pas dédupliquées
         * automatiquement par Obsidian comme les vues Markdown.
         */
        const existingLeaf =
            this.getOpenDevFileLeaf(path);

        if (existingLeaf) {
            await this.focusDevFileLeaf(
                existingLeaf
            );
            return;
        }

        if (!leaf) {
            leaf =
                this.app.workspace
                    .getLeaf(false);
        }

        await leaf.setViewState({
            type: VIEW_TYPE_DEV_FILE,
            active: true,
            state: {
                file: path
            }
        });
    },


    installExistingFileClickInterceptor() {
        const plugin = this;

        /*
         * Intercepte le clic AVANT le gestionnaire natif d'Obsidian.
         * Si le fichier est déjà ouvert dans Red File Editor, on
         * active directement sa leaf existante. Obsidian n'a donc
         * jamais l'occasion de créer une leaf temporaire "Nouvel onglet".
         *
         * Les clics avec Ctrl/Cmd/Shift/Alt et les clics non-gauche
         * restent natifs afin de conserver les comportements spéciaux
         * d'Obsidian (ouverture volontaire dans un nouvel onglet, etc.).
         */
        const onExplorerClickCapture = event => {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const title = target.closest(
                ".nav-file-title[data-path]"
            );

            if (!title) {
                return;
            }

            const path = title.getAttribute(
                "data-path"
            );

            if (!path) {
                return;
            }

            const name =
                path.split("/").pop() || path;

            const extension =
                plugin.getExtension(name);

            const handledByPlugin =
                name.startsWith(".") ||
                (
                    extension &&
                    extension !== "md" &&
                    plugin.settings.extensions
                        .includes(extension)
                );

            if (!handledByPlugin) {
                return;
            }

            const existingLeaf =
                plugin.getOpenDevFileLeaf(path);

            if (!existingLeaf) {
                return;
            }

            /*
             * Important : on bloque le clic pendant la phase capture.
             * Le handler de l'explorateur Obsidian ne s'exécute donc pas
             * et aucune nouvelle leaf n'est créée, même brièvement.
             */
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            void plugin.focusDevFileLeaf(
                existingLeaf
            );
        };

        document.addEventListener(
            "click",
            onExplorerClickCapture,
            true
        );

        this.register(() => {
            document.removeEventListener(
                "click",
                onExplorerClickCapture,
                true
            );
        });
    },


    installDotFileOpenHandler() {
        // Installer l'interception directement sur la classe de l'API.
        // Aucun getLeaf() ici : l'installation ne doit créer aucun onglet.
        const prototype =
            WorkspaceLeaf.prototype;

        if (
            !prototype ||
            typeof prototype.openFile !==
                "function"
        ) {
            console.warn(
                "[Dev File Editor] openFile introuvable."
            );
            return;
        }

        const originalOpenFile =
            prototype.openFile;

        const plugin =
            this;

        const patchedOpenFile =
            async function(
                file,
                openState
            ) {
                if (file instanceof TFile) {
                    const extension =
                        plugin.getExtension(
                            file.name
                        );

                    const handledByPlugin =
                        isDotFile(file) ||
                        (
                            extension &&
                            extension !== "md" &&
                            plugin.settings.extensions
                                .includes(extension)
                        );

                    if (handledByPlugin) {
                        const existingLeaf =
                            plugin.getOpenDevFileLeaf(
                                file.path
                            );

                        if (existingLeaf) {
                            /*
                             * Obsidian peut créer une leaf vide avant
                             * d'appeler openFile(). Si le fichier est
                             * déjà ouvert ailleurs, on réutilise cet
                             * onglet et on supprime uniquement la leaf
                             * temporaire vide afin de ne pas laisser un
                             * onglet "Nouvel onglet" derrière.
                             */
                            if (
                                this !== existingLeaf &&
                                this.view &&
                                typeof this.view.getViewType === "function" &&
                                this.view.getViewType() === "empty" &&
                                typeof this.detach === "function"
                            ) {
                                this.detach();
                            }

                            await plugin.focusDevFileLeaf(
                                existingLeaf
                            );
                            return;
                        }

                        await plugin
                            .openInDevEditor(
                                file,
                                this
                            );

                        return;
                    }
                }

                return originalOpenFile
                    .call(
                        this,
                        file,
                        openState
                    );
            };

        prototype.openFile =
            patchedOpenFile;

        this.register(
            () => {
                if (
                    prototype.openFile ===
                    patchedOpenFile
                ) {
                    prototype.openFile =
                        originalOpenFile;
                }
            }
        );
    },
};

module.exports = { openFileMethods };
