const { getPatterns } = require("./patterns");

/*
 * =========================================================
 * COLORATION SYNTAXIQUE LEGERE
 * =========================================================
 *
 * Aucun paquet npm requis.
 *
 * Le texte éditable reste dans un <textarea>.
 * Un <pre> synchronisé derrière le textarea fournit
 * la coloration syntaxique.
 */


function highlightCode(
    source,
    type
) {
    const lines =
        source.split("\n");

    return lines
        .map(
            line =>
                highlightLine(
                    line,
                    type
                )
        )
        .join("\n") +
        "\n";
}


function highlightLine(
    line,
    type
) {
    const patterns =
        getPatterns(type);

    let output = "";
    let position = 0;


    while (
        position < line.length
    ) {
        const remaining =
            line.slice(position);

        let best = null;


        for (
            const pattern
            of patterns
        ) {
            const match =
                remaining.match(
                    pattern.regex
                );

            if (
                !match ||
                match.index !== 0 ||
                !match[0]
            ) {
                continue;
            }


            best = {
                text: match[0],
                className:
                    pattern.className
            };

            break;
        }


        if (best) {
            output +=
                `<span class="${best.className}">${escapeHtml(best.text)}</span>`;

            position +=
                best.text.length;
        }

        else {
            output +=
                escapeHtml(
                    line[position]
                );

            position++;
        }
    }


    return output;
}

function escapeHtml(value) {
    return value
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

module.exports = { highlightCode, highlightLine, escapeHtml };
