/**
 * Conservative static screen for catastrophic-backtracking ("ReDoS") patterns.
 *
 * A native `RegExp` has no execution-time limit, so a pathological pattern can
 * block the event loop for an unbounded time on a tiny input (e.g.
 * `/^(a+)+$/.test("aaaa…!")`). This module flags the two structural shapes that
 * cause exponential backtracking:
 *
 *   1. An unbounded quantifier over a sub-expression that itself contains an
 *      unbounded quantifier, e.g. `(a+)+`, `(\d+)*`, `(a*b+)+`.
 *   2. An unbounded quantifier over an alternation whose branches can match the
 *      same prefix, e.g. `(a|ab)+`, `(a|a)+`, `(a|)+`. Overlap is detected with
 *      a textual prefix test, which is enough for the common cases.
 *
 * This is a heuristic screen, not a proof: it is intentionally conservative
 * (it may reject some safe patterns such as `(a|ab)+`) and it does not catch
 * every ReDoS shape. It removes the demonstrated exploit class but must not be
 * treated as a guarantee. Callers that need a hard bound should not evaluate
 * untrusted patterns at all.
 *
 * @param {string} pattern - A regular-expression source (without slashes).
 * @returns {boolean} `true` when the pattern is potentially catastrophic.
 */
export function isUnsafeRegExpPattern(pattern) {
        let pos = 0;
        let depth = 0;
        const MAX_DEPTH = 1000;

        function parseAlternation() {
                const start = pos;
                const branches = [parseSequence()];
                while (pattern[pos] === "|") {
                        pos++;
                        branches.push(parseSequence());
                }
                if (branches.length === 1) {
                        return branches[0];
                }
                return { type: "alt", branches, start, end: pos };
        }

        function parseSequence() {
                const start = pos;
                const terms = [];
                while (pos < pattern.length && pattern[pos] !== "|" && pattern[pos] !== ")") {
                        terms.push(parseTerm());
                }
                return { type: "seq", terms, start, end: pos };
        }

        function parseTerm() {
                const atom = parseAtom();
                const quantifier = parseQuantifier();
                if (quantifier) {
                        return { type: "quant", min: quantifier.min, max: quantifier.max, body: atom, start: atom.start, end: pos };
                }
                return atom;
        }

        function parseQuantifier() {
                const ch = pattern[pos];
                if (ch === "*") {
                        pos++;
                        return { min: 0, max: Infinity };
                }
                if (ch === "+") {
                        pos++;
                        return { min: 1, max: Infinity };
                }
                if (ch === "?") {
                        pos++;
                        return { min: 0, max: 1 };
                }
                if (ch === "{") {
                        const match = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(pos));
                        if (match) {
                                pos += match[0].length;
                                const min = Number(match[1]);
                                let max;
                                if (match[2] === undefined) {
                                        max = min;
                                } else {
                                        max = match[3] === "" ? Infinity : Number(match[3]);
                                }
                                return { min, max };
                        }
                }
                return null;
        }

        function parseAtom() {
                const start = pos;
                const ch = pattern[pos];

                if (ch === "(") {
                        pos++;
                        let zeroWidth = false;
                        if (pattern[pos] === "?") {
                                const rest = pattern.slice(pos);
                                if (rest.startsWith("?:")) {
                                        pos += 2;
                                } else if (rest.startsWith("?=") || rest.startsWith("?!")) {
                                        pos += 2;
                                        zeroWidth = true;
                                } else if (rest.startsWith("?<=") || rest.startsWith("?<!")) {
                                        pos += 3;
                                        zeroWidth = true;
                                } else if (rest.startsWith("?<")) {
                                        const named = /^\?<[A-Za-z_$][\w$]*>/.exec(rest);
                                        pos += named ? named[0].length : 2;
                                } else {
                                        pos += 1;
                                }
                        }
                        depth++;
                        if (depth > MAX_DEPTH) {
                                throw new RangeError("regexp nesting too deep");
                        }
                        const body = parseAlternation();
                        depth--;
                        if (pattern[pos] === ")") {
                                pos++;
                        }
                        return { type: "group", body, zeroWidth, start, end: pos };
                }

                if (ch === "[") {
                        pos++;
                        if (pattern[pos] === "^") {
                                pos++;
                        }
                        if (pattern[pos] === "]") {
                                pos++;
                        }
                        while (pos < pattern.length && pattern[pos] !== "]") {
                                if (pattern[pos] === "\\") {
                                        pos++;
                                }
                                pos++;
                        }
                        pos++;
                        return { type: "char", zeroWidth: false, start, end: pos };
                }

                if (ch === "\\") {
                        pos += 2;
                        const escaped = pattern[start + 1];
                        return { type: "char", zeroWidth: escaped === "b" || escaped === "B", start, end: pos };
                }

                pos++;
                return { type: "char", zeroWidth: ch === "^" || ch === "$", start, end: pos };
        }

        const raw = (node) => pattern.slice(node.start, node.end);

        function containsUnboundedQuantifier(node) {
                switch (node.type) {
                        case "quant":
                                if (node.max === Infinity) {
                                        return true;
                                }
                                return containsUnboundedQuantifier(node.body);
                        case "group":
                                return containsUnboundedQuantifier(node.body);
                        case "alt":
                                return node.branches.some(containsUnboundedQuantifier);
                        case "seq":
                                return node.terms.some(containsUnboundedQuantifier);
                        default:
                                return false;
                }
        }

        function alternationOverlaps(node) {
                if (node.type !== "alt") {
                        return false;
                }
                // A branch that can match the empty string makes every branch
                // ambiguous with it. Otherwise, one branch is a prefix of another
                // exactly when the two are adjacent after a lexicographic sort, so
                // this stays O(branches * log branches) instead of quadratic.
                const texts = node.branches.map(raw).sort();
                for (let i = 0; i + 1 < texts.length; i++) {
                        if (texts[i] === "" || texts[i + 1].startsWith(texts[i])) {
                                return true;
                        }
                }
                return false;
        }

        function isCatastrophic(node) {
                switch (node.type) {
                        case "quant": {
                                if (node.max === Infinity) {
                                        const inner = node.body.type === "group" ? node.body.body : node.body;
                                        if (containsUnboundedQuantifier(inner)) {
                                                return true;
                                        }
                                        if (inner.type === "alt" && alternationOverlaps(inner)) {
                                                return true;
                                        }
                                }
                                return isCatastrophic(node.body);
                        }
                        case "group":
                                return isCatastrophic(node.body);
                        case "alt":
                                return node.branches.some(isCatastrophic);
                        case "seq":
                                return node.terms.some(isCatastrophic);
                        default:
                                return false;
                }
        }

        try {
                return isCatastrophic(parseAlternation());
        } catch {
                // The pattern is already validated by the host RegExp constructor, so a
                // parse failure means this analyzer is incomplete, not that the input is
                // invalid. Fail open (do not reject) to avoid breaking valid patterns.
                return false;
        }
}
