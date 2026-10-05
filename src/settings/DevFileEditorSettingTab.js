const { PluginSettingTab, Setting } = require("obsidian");

class DevFileEditorSettingTab extends PluginSettingTab {

    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }


    display() {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl(
            "h2",
            {
                text: "Red File Editor"
            }
        );


        new Setting(containerEl)
            .setName("Largeur de l'éditeur")
            .setDesc(
                "Règle la largeur du bloc d'édition. " +
                "La modification est appliquée immédiatement."
            )
            .addSlider(slider => {
                slider
                    .setLimits(
                        50,
                        100,
                        1
                    )
                    .setValue(
                        this.plugin
                            .getEditorWidthPercent()
                    )
                    .setDynamicTooltip()
                    .onChange(
                        async value => {
                            this.plugin.settings
                                .editorWidthPercent =
                                    value;

                            this.plugin
                                .applyEditorWidth();

                            await this.plugin
                                .saveSettings();
                        }
                    );
            });


        const widthInfo =
            containerEl.createDiv({
                cls: "dev-file-editor-setting-info"
            });

        widthInfo.setText(
            `Largeur actuelle : ${
                this.plugin.getEditorWidthPercent()
            } %`
        );
    }
}

module.exports = { DevFileEditorSettingTab };
