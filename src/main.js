const { Plugin, TFile, Notice } = require("obsidian");
const { VIEW_TYPE_DEV_FILE, DEFAULT_EXTENSIONS } = require("./constants");
const { DevFileView } = require("./views/DevFileView");
const { CreateFileModal } = require("./modals/CreateFileModal");
const { ChangeExtensionModal } = require("./modals/ChangeExtensionModal");
const { DevFileEditorSettingTab } = require("./settings/DevFileEditorSettingTab");
const { isDotFile } = require("./editor/fileTypes");
const { openFileMethods } = require("./workspace/openFiles");
const { badgeMethods } = require("./explorer/badges");
const { dotfileMethods } = require("./explorer/dotfiles");
const { fileOperationMethods } = require("./files/operations");

// Point d'entrée du code source : initialisation, réglages et nettoyage.
class DevFileEditorPlugin extends Plugin {
    async onload() {
        console.log("Loading Dev File Editor V2");

        this.settings = Object.assign(
            {
                editorWidthPercent: 90,
                autoOpenEnvWithYaml: true,
                extensions: [
                    ...DEFAULT_EXTENSIONS
                ]
            },
            await this.loadData()
        );

        /*
         * Normalise les réglages venant d'anciennes versions.
         */
        this.settings.editorWidthPercent =
            this.getEditorWidthPercent();

        if (
            !Array.isArray(
                this.settings.extensions
            )
        ) {
            this.settings.extensions = [
                ...DEFAULT_EXTENSIONS
            ];
        }

        this.applyEditorWidth();

        this.addSettingTab(
            new DevFileEditorSettingTab(
                this.app,
                this
            )
        );

        this.registerView(
            VIEW_TYPE_DEV_FILE,
            leaf => new DevFileView(leaf)
        );

        this.registerSupportedExtensions();

        this.app.workspace.onLayoutReady(() => {
            this.installExistingFileClickInterceptor();
            this.installDotFileOpenHandler();
            this.installFileExplorerBadges();
            this.installHiddenDotFilesExplorer();
        });

        /*
         * Quand une note Markdown reçoit un nom qui contient
         * une extension, on retire automatiquement le .md final.
         *
         * Exemples :
         *   docker-compose.yml.md -> docker-compose.yml
         *   .env.md               -> .env
         */
        this.registerEvent(
            this.app.vault.on(
                "rename",
                async file => {
                    if (!(file instanceof TFile)) {
                        return;
                    }

                    if (
                        !file.name
                            .toLowerCase()
                            .endsWith(".md")
                    ) {
                        this.scheduleExplorerBadgeUpdate();
                        return;
                    }

                    const nameWithoutMd =
                        file.name.slice(0, -3);

                    if (
                        !this.hasExplicitExtension(
                            nameWithoutMd
                        )
                    ) {
                        this.scheduleExplorerBadgeUpdate();
                        return;
                    }

                    const extension =
                        this.getExtension(
                            nameWithoutMd
                        );

                    if (extension) {
                        await this.addExtension(
                            extension
                        );
                    }

                    const newPath =
                        file.parent &&
                        file.parent.path !== "/"
                            ? `${file.parent.path}/${nameWithoutMd}`
                            : nameWithoutMd;

                    const existing =
                        this.app.vault
                            .getAbstractFileByPath(
                                newPath
                            );

                    if (existing) {
                        new Notice(
                            `Le fichier existe déjà : ${newPath}`
                        );
                        return;
                    }

                    try {
                        await this.app.fileManager
                            .renameFile(
                                file,
                                newPath
                            );

                        const renamedFile =
                            this.app.vault
                                .getAbstractFileByPath(
                                    newPath
                                );

                        if (
                            renamedFile instanceof TFile &&
                            isDotFile(renamedFile)
                        ) {
                            await this.openInDevEditor(
                                renamedFile
                            );
                        }

                        this.scheduleExplorerBadgeUpdate();
                    }

                    catch (error) {
                        console.error(
                            "Dev File Editor:",
                            error
                        );
                    }
                }
            )
        );

        this.addCommand({
            id: "create-file",
            name: "Create file",
            callback: () => {
                new CreateFileModal(
                    this.app,
                    this
                ).open();
            }
        });

        this.addCommand({
            id: "remove-trailing-md",
            name: "Remove trailing .md",
            checkCallback: checking => {
                const file =
                    this.app.workspace
                        .getActiveFile();

                const valid =
                    file &&
                    file instanceof TFile &&
                    file.name
                        .toLowerCase()
                        .endsWith(".md");

                if (
                    valid &&
                    !checking
                ) {
                    this.removeTrailingMd(file);
                }

                return valid;
            }
        });

        this.addCommand({
            id: "change-extension",
            name: "Change file extension",
            checkCallback: checking => {
                const file =
                    this.app.workspace
                        .getActiveFile();

                const valid =
                    file instanceof TFile;

                if (
                    valid &&
                    !checking
                ) {
                    new ChangeExtensionModal(
                        this.app,
                        this,
                        file
                    ).open();
                }

                return valid;
            }
        });

        this.registerEvent(
            this.app.workspace.on(
                "file-menu",
                (menu, file) => {
                    if (!(file instanceof TFile)) {
                        return;
                    }

                    if (
                        file.extension !== "md"
                    ) {
                        menu.addItem(item => {
                            item
                                .setTitle(
                                    "Open in Dev File Editor"
                                )
                                .setIcon("file-code")
                                .onClick(
                                    async () => {
                                        await this.openInDevEditor(
                                            file
                                        );
                                    }
                                );
                        });
                    }

                    if (
                        file.name
                            .toLowerCase()
                            .endsWith(".md")
                    ) {
                        menu.addItem(item => {
                            item
                                .setTitle(
                                    "Remove trailing .md"
                                )
                                .setIcon("file-code")
                                .onClick(
                                    async () => {
                                        await this.removeTrailingMd(
                                            file
                                        );
                                    }
                                );
                        });
                    }

                    menu.addItem(item => {
                        item
                            .setTitle(
                                "Change extension"
                            )
                            .setIcon("file-edit")
                            .onClick(
                                () => {
                                    new ChangeExtensionModal(
                                        this.app,
                                        this,
                                        file
                                    ).open();
                                }
                            );
                    });
                }
            )
        );

        this.addRibbonIcon(
            "file-plus",
            "Create file",
            () => {
                new CreateFileModal(
                    this.app,
                    this
                ).open();
            }
        );
    }

    getEditorWidthPercent() {
        const value =
            Number(
                this.settings &&
                this.settings.editorWidthPercent
            );

        if (
            !Number.isFinite(value)
        ) {
            return 90;
        }

        return Math.min(
            100,
            Math.max(
                50,
                Math.round(value)
            )
        );
    }


    applyEditorWidth() {
        const value =
            this.getEditorWidthPercent();

        document.documentElement
            .style
            .setProperty(
                "--dev-file-editor-width",
                `${value}%`
            );
    }


    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        if (
            this.badgeUpdateTimer
        ) {
            clearTimeout(
                this.badgeUpdateTimer
            );
        }

        if (
            this.hiddenFilesUpdateTimer
        ) {
            clearTimeout(
                this.hiddenFilesUpdateTimer
            );
        }

        document
            .querySelectorAll(
                ".dev-file-explorer-badge"
            )
            .forEach(
                element =>
                    element.remove()
            );

        document
            .querySelectorAll(
                ".dev-hidden-dotfile"
            )
            .forEach(
                element =>
                    element.remove()
            );

        document.documentElement
            .style
            .removeProperty(
                "--dev-file-editor-width"
            );

        console.log(
            "Unloading Dev File Editor V2"
        );
    }
}

// Chaque module conserve les méthodes existantes et le même `this`.
Object.assign(
    DevFileEditorPlugin.prototype,
    openFileMethods,
    badgeMethods,
    dotfileMethods,
    fileOperationMethods
);

module.exports = DevFileEditorPlugin;
