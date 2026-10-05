const { TFile } = require("obsidian");

function isDotFile(file) {
    if (!(file instanceof TFile)) {
        return false;
    }

    return (
        file.name.startsWith(".") &&
        file.name.length > 1
    );
}


function getTypeLabelFromFile(file) {
    if (!(file instanceof TFile)) {
        return "TEXT";
    }

    return getTypeLabelFromName(file.name);
}


function getTypeLabelFromName(filename) {
    const name =
        String(filename || "")
            .toLowerCase();

    if (
        name === ".env" ||
        name.startsWith(".env.")
    ) {
        return "ENV";
    }

    if (name === ".gitignore") {
        return "GIT";
    }

    if (name === ".npmrc") {
        return "NPM";
    }

    if (name === ".bashrc") {
        return "BASH";
    }

    if (name === ".zshrc") {
        return "ZSH";
    }

    let extension = "";
    const lastDot = name.lastIndexOf(".");

    if (lastDot >= 0 && lastDot < name.length - 1) {
        extension = name.substring(lastDot + 1);
    }

    const labels = {
        env: "ENV",
        example: "EXAMPLE",
        yml: "YAML",
        yaml: "YAML",
        json: "JSON",
        jsonc: "JSON",
        txt: "TEXT",
        text: "TEXT",
        log: "LOG",
        conf: "CONF",
        config: "CONF",
        cfg: "CONF",
        ini: "INI",
        toml: "TOML",
        properties: "PROPERTIES",
        sh: "SHELL",
        bash: "BASH",
        zsh: "ZSH",
        js: "JAVASCRIPT",
        jsx: "JSX",
        ts: "TYPESCRIPT",
        tsx: "TSX",
        py: "PYTHON",
        php: "PHP",
        rb: "RUBY",
        go: "GO",
        rs: "RUST",
        java: "JAVA",
        c: "C",
        cpp: "C++",
        h: "C HEADER",
        hpp: "C++ HEADER",
        html: "HTML",
        htm: "HTML",
        css: "CSS",
        scss: "SCSS",
        xml: "XML",
        csv: "CSV",
        sql: "SQL"
    };

    return (
        labels[extension] ||
        extension.toUpperCase() ||
        "TEXT"
    );
}

module.exports = { isDotFile, getTypeLabelFromFile, getTypeLabelFromName };
