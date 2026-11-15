import { describe, test } from "node:test";
import assert from "node:assert";

import { isUnsafeRegExpPattern } from "./regExpSafety.js";

describe("isUnsafeRegExpPattern", () => {
	describe("catastrophic patterns", () => {
		test("nested unbounded quantifiers", () => {
			for (const pattern of ["^(a+)+$", "(a+)*", "(\\d+)*", "([a-z]+)*", "(a*b+)+", "((a)+)+", "(a+)+b"]) {
				assert.equal(isUnsafeRegExpPattern(pattern), true, pattern);
			}
		});

		test("unbounded quantifier over an overlapping alternation", () => {
			for (const pattern of ["(a|ab)+", "(a|a)+", "(a|)+", "(a|b|ab)+", "(x|xy|xyz)+"]) {
				assert.equal(isUnsafeRegExpPattern(pattern), true, pattern);
			}
		});

		test("alternation branches that overlap through a class or wildcard", () => {
			// A textual-prefix test misses these: the branches differ in spelling
			// but consume the same first character, which is enough to make the
			// quantified group backtrack exponentially. `/^(a|.)+X$/` alone takes
			// tens of seconds on ~30 characters.
			for (const pattern of ["(a|.)+", "([ab]|a)+", "(\\w|a)+", "([a-z]|[b-d])+", "(cat|car)+", "(\\d|\\w)+", "(a.|a)+"]) {
				assert.equal(isUnsafeRegExpPattern(pattern), true, pattern);
			}
		});

		test("adjacent unbounded quantifiers over overlapping characters", () => {
			// Polynomial (quadratic) blowup: neither quantifier is nested inside
			// the other, but they can consume the same characters, so a
			// non-matching input forces a quadratic number of splits.
			// `/.*.*x/` takes over two seconds on 2000 characters.
			for (const pattern of [".*.*x", ".*.*.*x", "a*a*b", "a*a*a*b", "[0-9]*[0-9]*x", "(a*)(a*)b", "\\d*\\d*x", "\\w*\\w*x"]) {
				assert.equal(isUnsafeRegExpPattern(pattern), true, pattern);
			}
		});
	});

	describe("safe patterns", () => {
		test("plain literals and bounded quantifiers", () => {
			for (const pattern of ["hello", "\\d+", "[0-9]+", "^abc$", "a+b*c?", "(ab+c)", "a{2,5}", "example\\.com", "\\w+@\\w+\\.\\w+"]) {
				assert.equal(isUnsafeRegExpPattern(pattern), false, pattern);
			}
		});

		test("adjacent quantifiers over disjoint characters", () => {
			// `a*b*` and `\s*\w+` have adjacent unbounded quantifiers, but their
			// character sets are disjoint so there is no ambiguity to backtrack
			// over. Treating `\s`/`\w` as opaque would wrongly reject `\s*\w+`,
			// which is extremely common.
			for (const pattern of ["a*b*", "\\s*\\w+", "\\w+\\s*", ".*\\..*", "[a-z]+[0-9]+", "\\d+\\.\\d+", "\\d*\\.\\d+"]) {
				assert.equal(isUnsafeRegExpPattern(pattern), false, pattern);
			}
		});

		test("non-overlapping alternation and groups", () => {
			for (const pattern of ["(a|b)+", "(?:ab)+", "(foo|bar)+", "(a)|(b)", "(?:a|b|c)+", "(?=a+)b", "(?<name>a+)", "(a|bc)+", "(ab|cd)+", "(a|b|c)+", "(red|green|blue)+"]) {
				assert.equal(isUnsafeRegExpPattern(pattern), false, pattern);
			}
		});
	});

	test("does not throw on deeply nested patterns", () => {
		const deep = "(".repeat(3000) + "a" + ")".repeat(3000);
		assert.doesNotThrow(() => isUnsafeRegExpPattern(deep));
	});
});
