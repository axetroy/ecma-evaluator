/**
 * Conservative static screen for catastrophic-backtracking ("ReDoS") patterns.
 *
 * A native `RegExp` has no execution-time limit, so a pathological pattern can
 * block the event loop for an unbounded time on a tiny input (e.g.
 * `/^(a+)+$/.test("aaaa…!")`). This module flags three structural shapes:
 *
 *   1. An unbounded quantifier over a sub-expression that itself contains an
 *      unbounded quantifier, e.g. `(a+)+`, `(\d+)*`, `(a*b+)+` — exponential.
 *   2. An unbounded quantifier over an alternation whose branches can match the
 *      same first character, e.g. `(a|ab)+`, `(a|.)+`, `([ab]|a)+` —
 *      exponential. Overlap is detected both textually (one branch is a prefix
 *      of another) and through an approximate first-character set.
 *   3. Adjacent unbounded quantifiers over overlapping characters, e.g.
 *      `.*.*x`, `a*a*b`, `(a*)(a*)b` — polynomial (quadratic).
 *
 * This is a heuristic screen, not a proof: it is intentionally conservative
 * (it may reject some safe patterns such as `(a|ab)+`) and it does not catch
 * every ReDoS shape. It removes the demonstrated exploit classes but must not
 * be treated as a guarantee. Callers that need a hard bound should not evaluate
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

        /**
         * Approximate set of characters a node can start with, as a `Set<string>`
         * or the sentinel `ANY` when it cannot be bounded (a negated class, a
         * wildcard, a backreference, an unbounded quantifier, …). It is only used
         * to decide whether two branches/terms *might* consume the same
         * character, so over-approximation is safe: a false "may overlap" only
         * rejects a pattern that is already suspicious. A precise set is worth
         * the effort though — treating `\s` and `\w` as `ANY` would wrongly flag
         * the ubiquitous `\s*\w+` as a polynomial risk.
         */
        const ANY = Symbol("any");
        const DIGITS = new Set("0123456789".split(""));
        const WORD = new Set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_".split(""));
        const SPACES = new Set([" ", "\t", "\n", "\r", "\f", "\v", "\u00a0", "\ufeff", "\u2028", "\u2029"]);

        /** Expands a single (already unescaped) class escape such as `d`, `w`, `s`. */
        function escapeSet(esc) {
                switch (esc) {
                        case "d":
                                return DIGITS;
                        case "w":
                                return WORD;
                        case "s":
                                return SPACES;
                        case "n":
                                return new Set(["\n"]);
                        case "t":
                                return new Set(["\t"]);
                        case "r":
                                return new Set(["\r"]);
                        case "f":
                                return new Set(["\f"]);
                        case "v":
                                return new Set(["\v"]);
                        case "0":
                                return new Set(["\0"]);
                        default:
                                // A backreference (`\1`) or a negated class (`\D`, `\W`,
                                // `\S`) cannot be enumerated; treat it as unbounded.
                                if (/[0-9A-Za-z]/.test(esc)) {
                                        return ANY;
                                }
                                // Escaped punctuation (`\.`, `\+`, `\*`, …) is the
                                // literal character itself.
                                return new Set([esc]);
                }
        }

        /** Parses a `[...]` character class into a concrete set, or `ANY` when negated/opaque. */
        function classSet(text) {
                // text is the raw slice including the surrounding brackets.
                const inner = text.slice(1, -1);
                if (inner.startsWith("^")) {
                        return ANY;
                }
                const set = new Set();
                for (let i = 0; i < inner.length; i++) {
                        let ch = inner[i];
                        if (ch === "\\") {
                                const esc = inner[++i];
                                const expanded = escapeSet(esc);
                                if (expanded === ANY) {
                                        return ANY;
                                }
                                for (const c of expanded) set.add(c);
                                continue;
                        }
                        // Range: `a-z`.
                        if (inner[i + 1] === "-" && inner[i + 2] !== undefined && inner[i + 2] !== "]") {
                                const end = inner[i + 2];
                                const startCode = ch.codePointAt(0);
                                const endCode = end.codePointAt(0);
                                // Cap the expansion so a huge range cannot blow up memory.
                                if (endCode - startCode > 1024) {
                                        return ANY;
                                }
                                for (let code = startCode; code <= endCode; code++) {
                                        set.add(String.fromCodePoint(code));
                                }
                                i += 2;
                                continue;
                        }
                        set.add(ch);
                }
                return set;
        }

        function firstCharSet(node) {
                switch (node.type) {
                        case "char": {
                                const text = raw(node);
                                if (node.zeroWidth || text.startsWith("^") || text.startsWith("$")) {
                                        return new Set();
                                }
                                if (text === ".") {
                                        return ANY;
                                }
                                if (text.startsWith("[")) {
                                        return classSet(text);
                                }
                                if (text.startsWith("\\")) {
                                        const esc = text.slice(1);
                                        if (esc.length === 1) {
                                                return escapeSet(esc);
                                        }
                                        // \p{..}, \k<..>, \1 backrefs, etc. are opaque.
                                        return ANY;
                                }
                                return new Set([text[0]]);
                        }
                        case "quant":
                                return node.min === 0 ? ANY : firstCharSet(node.body);
                        case "group":
                                return node.zeroWidth ? ANY : firstCharSet(node.body);
                        case "alt": {
                                const union = new Set();
                                for (const branch of node.branches) {
                                        const set = firstCharSet(branch);
                                        if (set === ANY) return ANY;
                                        for (const ch of set) union.add(ch);
                                }
                                return union;
                        }
                        case "seq":
                                for (const term of node.terms) {
                                        const set = firstCharSet(term);
                                        if (set === ANY) return ANY;
                                        if (set.size > 0) return set;
                                }
                                return new Set();
                        default:
                                return ANY;
                }
        }

        /** `true` when the two sets share at least one start character (or either is `ANY`). */
        function setsIntersect(a, b) {
                if (a === ANY || b === ANY) return true;
                if (a.size === 0 || b.size === 0) return false;
                const [small, large] = a.size <= b.size ? [a, b] : [b, a];
                for (const ch of small) {
                        if (large.has(ch)) return true;
                }
                return false;
        }

        /**
         * The set of characters a quantifier can consume. Unlike
         * {@link firstCharSet}, this never returns `ANY` merely because the
         * quantifier may match the empty string: `\s*` consumes only whitespace,
         * so it does not overlap `\w+`.
         */
        function consumableCharSet(quantNode) {
                return firstCharSet(quantNode.body);
        }

        /**
         * Adjacent unbounded quantifiers whose consumed character sets overlap
         * (`a*a*b`, `.*.*x`) backtrack polynomially — quadratic on a
         * non-matching input. This is a *different* shape from the
         * nested-quantifier case: neither quantifier is inside the other. Two
         * `*`/`+` terms over disjoint characters (`a*b*`, `\s*\w+`) are safe and
         * must not be flagged.
         *
         * The quantifiers need not be literal siblings: `(a*)(a*)b` is the same
         * hazard with each quantifier wrapped in its own group, so the boundary
         * between two terms is compared through their *trailing* and *leading*
         * quantifiers respectively.
         */
        function trailingQuantifier(node) {
                switch (node.type) {
                        case "quant":
                                return node.max === Infinity ? node : null;
                        case "group":
                                return node.zeroWidth ? null : trailingQuantifier(node.body);
                        case "seq": {
                                for (let i = node.terms.length - 1; i >= 0; i--) {
                                        const quantifier = trailingQuantifier(node.terms[i]);
                                        if (quantifier) return quantifier;
                                        const set = firstCharSet(node.terms[i]);
                                        if (set === ANY || set.size > 0) return null;
                                }
                                return null;
                        }
                        default:
                                return null;
                }
        }

        function leadingQuantifier(node) {
                switch (node.type) {
                        case "quant":
                                return node.max === Infinity ? node : null;
                        case "group":
                                return node.zeroWidth ? null : leadingQuantifier(node.body);
                        case "seq": {
                                for (const term of node.terms) {
                                        const quantifier = leadingQuantifier(term);
                                        if (quantifier) return quantifier;
                                        const set = firstCharSet(term);
                                        if (set === ANY || set.size > 0) return null;
                                }
                                return null;
                        }
                        default:
                                return null;
                }
        }

        function hasAdjacentOverlappingQuantifiers(seqNode) {
                const terms = seqNode.terms;
                for (let i = 0; i + 1 < terms.length; i++) {
                        const left = trailingQuantifier(terms[i]);
                        const right = leadingQuantifier(terms[i + 1]);
                        if (left && right && setsIntersect(consumableCharSet(left), consumableCharSet(right))) {
                                return true;
                        }
                }
                return false;
        }

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
                // Textual prefixes miss branches that overlap through a character
                // class or a different literal that starts the same way, e.g.
                // `(a|.)`, `([ab]|a)`, `(\w|a)`. Those are catastrophic under an
                // unbounded quantifier exactly like `(a|ab)` is, so also compare
                // the (over-approximated) set of first characters each branch can
                // consume. This is a superset of the prefix case.
                const sets = node.branches.map(firstCharSet);
                for (let i = 0; i < sets.length; i++) {
                        for (let j = i + 1; j < sets.length; j++) {
                                if (setsIntersect(sets[i], sets[j])) {
                                        return true;
                                }
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
                                return hasAdjacentOverlappingQuantifiers(node) || node.terms.some(isCatastrophic);
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
