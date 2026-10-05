// Règles de coloration, regroupées par langage.

function getPatterns(type) {
    const common = [
        {
            regex:
                /^\$\{[A-Za-z_][A-Za-z0-9_]*\}/,

            className:
                "tok-variable"
        },

        {
            regex:
                /^"(?:\\.|[^"\\])*"/,

            className:
                "tok-string"
        },

        {
            regex:
                /^'(?:\\.|[^'\\])*'/,

            className:
                "tok-string"
        },

        {
            regex:
                /^`(?:\\.|[^`\\])*`/,

            className:
                "tok-string"
        },

        {
            regex:
                /^\b(?:true|false|null|yes|no|on|off)\b/i,

            className:
                "tok-boolean"
        },

        {
            regex:
                /^-?\b\d+(?:\.\d+)?\b/,

            className:
                "tok-number"
        }
    ];


    switch (type) {

        case "ENV":
            return [
                {
                    regex:
                        /^#[^\n]*/,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^[A-Za-z_][A-Za-z0-9_]*(?=\s*=)/,

                    className:
                        "tok-key"
                },

                {
                    regex:
                        /^=/,

                    className:
                        "tok-punctuation"
                },

                ...common
            ];


        case "YAML":
            return [
                {
                    regex:
                        /^#[^\n]*/,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^[A-Za-z0-9_.-]+(?=\s*:)/,

                    className:
                        "tok-key"
                },

                {
                    regex:
                        /^[-?:,[\]{}]/,

                    className:
                        "tok-punctuation"
                },

                ...common
            ];


        case "JSON":
            return [
                {
                    regex:
                        /^"(?:\\.|[^"\\])*"(?=\s*:)/,

                    className:
                        "tok-key"
                },

                {
                    regex:
                        /^[{}\[\],:]/,

                    className:
                        "tok-punctuation"
                },

                ...common
            ];


        case "JAVASCRIPT":
        case "JSX":
        case "TYPESCRIPT":
        case "TSX":
            return [
                {
                    regex:
                        /^\/\/[^\n]*/,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^\/\*.*?\*\//,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|async|await|try|catch|finally|throw|import|from|export|default|typeof|instanceof|in|of|interface|type|enum|implements|public|private|protected|static)\b/,

                    className:
                        "tok-keyword"
                },

                ...common
            ];


        case "PYTHON":
            return [
                {
                    regex:
                        /^#[^\n]*/,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^\b(?:def|class|return|if|elif|else|for|while|break|continue|import|from|as|try|except|finally|raise|with|lambda|yield|async|await|pass|in|is|not|and|or|None|True|False)\b/,

                    className:
                        "tok-keyword"
                },

                ...common
            ];


        case "SHELL":
        case "BASH":
        case "ZSH":
            return [
                {
                    regex:
                        /^#[^\n]*/,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^\$[A-Za-z_][A-Za-z0-9_]*/,

                    className:
                        "tok-variable"
                },

                {
                    regex:
                        /^\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|function|in|export|local|readonly|source)\b/,

                    className:
                        "tok-keyword"
                },

                ...common
            ];


        case "INI":
        case "CONF":
        case "PROPERTIES":
        case "TOML":
            return [
                {
                    regex:
                        /^[#;][^\n]*/,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^\[[^\]]+\]/,

                    className:
                        "tok-section"
                },

                {
                    regex:
                        /^[A-Za-z0-9_.-]+(?=\s*[=:])/,

                    className:
                        "tok-key"
                },

                ...common
            ];


        case "CSS":
        case "SCSS":
            return [
                {
                    regex:
                        /^\/\*.*?\*\//,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^--[A-Za-z0-9_-]+(?=\s*:)/,

                    className:
                        "tok-variable"
                },

                {
                    regex:
                        /^[A-Za-z-]+(?=\s*:)/,

                    className:
                        "tok-key"
                },

                ...common
            ];


        case "HTML":
        case "XML":
            return [
                {
                    regex:
                        /^<!--.*?-->/,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^<\/?[A-Za-z][A-Za-z0-9:_-]*/,

                    className:
                        "tok-keyword"
                },

                {
                    regex:
                        /^[A-Za-z_:][-A-Za-z0-9_:.]*(?=\s*=)/,

                    className:
                        "tok-key"
                },

                ...common
            ];


        case "SQL":
            return [
                {
                    regex:
                        /^--[^\n]*/,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^\b(?:select|from|where|insert|into|update|delete|create|drop|alter|table|join|left|right|inner|outer|on|as|and|or|not|null|values|set|group|by|order|having|limit|offset|distinct|union)\b/i,

                    className:
                        "tok-keyword"
                },

                ...common
            ];


        default:
            return [
                {
                    regex:
                        /^#[^\n]*/,

                    className:
                        "tok-comment"
                },

                {
                    regex:
                        /^\/\/[^\n]*/,

                    className:
                        "tok-comment"
                },

                ...common
            ];
    }
}

module.exports = { getPatterns };
