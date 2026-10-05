const { Modal, Setting } = require("obsidian");

class ChangeExtensionModal extends Modal {

    constructor(app, plugin, file) {
        super(app);

        this.plugin = plugin;
        this.file = file;

        /*
         * Le champ reste réellement vide.
         * L'extension actuelle est affichée uniquement
         * comme placeholder dans la zone de saisie.
         */
        this.extension = "";
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", {
            text: "Changer l'extension"
        });

        contentEl.createEl("p", {
            text: `Fichier : ${this.file.name}`
        });

        new Setting(contentEl)
            .setName("Nouvelle extension")
            .setDesc("Exemples : env, txt, yaml, conf")
            .addText(text => {

                const currentExtension =
                    "." + this.plugin.getExtension(
                        this.file.name
                    );

                text
                    .setPlaceholder(
                        currentExtension
                    )
                    .onChange(value => {

                        this.extension =
                            value.trim();

                    });

                setTimeout(
                    () => text.inputEl.focus(),
                    50
                );

            });

        new Setting(contentEl)
            .addButton(button => {
                button
                    .setButtonText("Renommer")
                    .setCta()
                    .onClick(async () => {
                        if (!this.extension) {
                            return;
                        }

                        this.close();

                        await this.plugin.changeExtension(
                            this.file,
                            this.extension
                        );
                    });
            });
    }

    onClose() {
        this.contentEl.empty();
    }
}

module.exports = { ChangeExtensionModal };
