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
	});

	describe("safe patterns", () => {
		test("plain literals and bounded quantifiers", () => {
			for (const pattern of ["hello", "\\d+", "[0-9]+", "^abc$", "a+b*c?", "(ab+c)", "a{2,5}", "example\\.com", "\\w+@\\w+\\.\\w+"]) {
				assert.equal(isUnsafeRegExpPattern(pattern), false, pattern);
			}
		});

		test("non-overlapping alternation and groups", () => {
			for (const pattern of ["(a|b)+", "(?:ab)+", "(foo|bar)+", "(a)|(b)", "(?:a|b|c)+", "(?=a+)b", "(?<name>a+)"]) {
				assert.equal(isUnsafeRegExpPattern(pattern), false, pattern);
			}
		});
	});

	test("does not throw on deeply nested patterns", () => {
		const deep = "(".repeat(3000) + "a" + ")".repeat(3000);
		assert.doesNotThrow(() => isUnsafeRegExpPattern(deep));
	});
});
