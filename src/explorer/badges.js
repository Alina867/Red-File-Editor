const { TFile } = require("obsidian");
const { isDotFile, getTypeLabelFromFile } = require("../editor/fileTypes");

// Méthodes rattachées au prototype du plugin dans src/main.js.
// `this` désigne toujours la même instance du plugin.
const badgeMethods = {
    installFileExplorerBadges() {
        this.scheduleExplorerBadgeUpdate();

        const observer =
            new MutationObserver(
                () => {
                    this.scheduleExplorerBadgeUpdate();
                }
            );

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        this.register(
            () => {
                observer.disconnect();
            }
        );

        this.registerEvent(
            this.app.vault.on(
                "create",
                () => {
                    this.scheduleExplorerBadgeUpdate();
                }
            )
        );

        this.registerEvent(
            this.app.vault.on(
                "delete",
                () => {
                    this.scheduleExplorerBadgeUpdate();
                }
            )
        );
    },


    scheduleExplorerBadgeUpdate() {
        if (
            this.badgeUpdateTimer
        ) {
            clearTimeout(
                this.badgeUpdateTimer
            );
        }

        this.badgeUpdateTimer =
            setTimeout(
                () => {
                    this.updateFileExplorerBadges();
                },
                100
            );
    },


    updateFileExplorerBadges() {
        const titles =
            document.querySelectorAll(
                ".nav-file-title"
            );

        titles.forEach(
            title => {
                const oldBadge =
                    title.querySelector(
                        ".dev-file-explorer-badge"
                    );

                const path =
                    title.getAttribute(
                        "data-path"
                    );

                if (!path) {
                    return;
                }

                const file =
                    this.app.vault
                        .getAbstractFileByPath(
                            path
                        );

                if (
                    !(file instanceof TFile)
                ) {
                    return;
                }

                /*
                 * On ajoute nos propres badges uniquement
                 * aux vrais dotfiles. Obsidian garde ses
                 * badges natifs pour YAML, JSON, etc.
                 */
                if (!isDotFile(file)) {
                    return;
                }

                const label =
                    getTypeLabelFromFile(file);

                if (!label) {
                    return;
                }

                if (oldBadge) {
                    if (oldBadge.textContent !== label) {
                        oldBadge.textContent = label;
                    }
                    return;
                }

                const badge =
                    document.createElement(
                        "span"
                    );

                badge.className =
                    "dev-file-explorer-badge";

                badge.textContent =
                    label;

                title.appendChild(
                    badge
                );
            }
        );
    },
};

module.exports = { badgeMethods };
