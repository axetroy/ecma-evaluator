const mutableMethods = [
	"Array.prototype.push",
	"Array.prototype.pop",
	"Array.prototype.shift",
	"Array.prototype.unshift",
	"Array.prototype.splice",
	"Array.prototype.reverse",
	"Array.prototype.sort",
	"Array.prototype.fill",
	"Array.prototype.copyWithin",

	"Object.defineProperty",
	"Object.defineProperties",
	"Object.preventExtensions",
	"Object.seal",
	"Object.freeze",
	"Object.setPrototypeOf",
	"Object.assign",
	"Object.prototype.__defineGetter__",
	"Object.prototype.__defineSetter__",

	"Reflect.set",
	"Reflect.defineProperty",
	"Reflect.deleteProperty",
	"Reflect.setPrototypeOf",
	"Reflect.preventExtensions",

	"Set.prototype.add",
	"Set.prototype.delete",
	"Set.prototype.clear",
	"WeakSet.prototype.add",
	"WeakSet.prototype.delete",

	"Map.prototype.set",
	"Map.prototype.delete",
	"Map.prototype.clear",
	"WeakMap.prototype.set",
	"WeakMap.prototype.delete",

	"Date.prototype.setTime",
	"Date.prototype.setMilliseconds",
	"Date.prototype.setUTCSeconds",
	"Date.prototype.setSeconds",
	"Date.prototype.setMinutes",
	"Date.prototype.setHours",
	"Date.prototype.setDate",
	"Date.prototype.setMonth",
	"Date.prototype.setFullYear",
	"Date.prototype.setYear",
	"Date.prototype.setUTCMilliseconds",
	"Date.prototype.setUTCMinutes",
	"Date.prototype.setUTCHours",
	"Date.prototype.setUTCDate",
	"Date.prototype.setUTCMonth",
	"Date.prototype.setUTCFullYear",

	"RegExp.prototype.compile",

	"Int8Array.prototype.set",
	"Uint8Array.prototype.set",
	"Uint8ClampedArray.prototype.set",
	"Int16Array.prototype.set",
	"Uint16Array.prototype.set",
	"Int32Array.prototype.set",
	"Uint32Array.prototype.set",
	"Float32Array.prototype.set",
	"Float64Array.prototype.set",
	"BigInt64Array.prototype.set",
	"BigUint64Array.prototype.set",

	"Int8Array.prototype.fill",
	"Uint8Array.prototype.fill",
	"Uint8ClampedArray.prototype.fill",
	"Int16Array.prototype.fill",
	"Uint16Array.prototype.fill",
	"Int32Array.prototype.fill",
	"Uint32Array.prototype.fill",
	"Float32Array.prototype.fill",
	"Float64Array.prototype.fill",
	"BigInt64Array.prototype.fill",
	"BigUint64Array.prototype.fill",

	"Int8Array.prototype.reverse",
	"Uint8Array.prototype.reverse",
	"Uint8ClampedArray.prototype.reverse",
	"Int16Array.prototype.reverse",
	"Uint16Array.prototype.reverse",
	"Int32Array.prototype.reverse",
	"Uint32Array.prototype.reverse",
	"Float32Array.prototype.reverse",
	"Float64Array.prototype.reverse",
	"BigInt64Array.prototype.reverse",
	"BigUint64Array.prototype.reverse",

	"Int8Array.prototype.sort",
	"Uint8Array.prototype.sort",
	"Uint8ClampedArray.prototype.sort",
	"Int16Array.prototype.sort",
	"Uint16Array.prototype.sort",
	"Int32Array.prototype.sort",
	"Uint32Array.prototype.sort",
	"Float32Array.prototype.sort",
	"Float64Array.prototype.sort",
	"BigInt64Array.prototype.sort",
	"BigUint64Array.prototype.sort",

	"Int8Array.prototype.copyWithin",
	"Uint8Array.prototype.copyWithin",
	"Uint8ClampedArray.prototype.copyWithin",
	"Int16Array.prototype.copyWithin",
	"Uint16Array.prototype.copyWithin",
	"Int32Array.prototype.copyWithin",
	"Uint32Array.prototype.copyWithin",
	"Float32Array.prototype.copyWithin",
	"Float64Array.prototype.copyWithin",
	"BigInt64Array.prototype.copyWithin",
	"BigUint64Array.prototype.copyWithin",

	"ArrayBuffer.prototype.transfer",
	"ArrayBuffer.prototype.transferToFixedLength",

	"SharedArrayBuffer.prototype.grow",

	"DataView.prototype.setInt8",
	"DataView.prototype.setUint8",
	"DataView.prototype.setInt16",
	"DataView.prototype.setUint16",
	"DataView.prototype.setInt32",
	"DataView.prototype.setUint32",
	"DataView.prototype.setFloat32",
	"DataView.prototype.setFloat64",
	"DataView.prototype.setBigInt64",
	"DataView.prototype.setBigUint64",

	"Promise.prototype.catch",
	"Promise.prototype.finally",

	"Generator.prototype.next",
	"Generator.prototype.return",
	"Generator.prototype.throw",

	"AsyncGenerator.prototype.next",
	"AsyncGenerator.prototype.return",
	"AsyncGenerator.prototype.throw",

	"Iterator.prototype.next",

	"WeakRef.prototype.deref",

	"FinalizationRegistry.prototype.register",
	"FinalizationRegistry.prototype.unregister",

	"URLSearchParams.prototype.append",
	"URLSearchParams.prototype.delete",
	"URLSearchParams.prototype.set",
	"URLSearchParams.prototype.sort",

	"FormData.prototype.append",
	"FormData.prototype.delete",
	"FormData.prototype.set",

	"Headers.prototype.append",
	"Headers.prototype.delete",
	"Headers.prototype.set",

	// Function call/apply/bind can be used to invoke with arbitrary `this`
	"Function.prototype.call",
	"Function.prototype.apply",
	"Function.prototype.bind",
	"Function.prototype.constructor",

	// Legacy lookup helpers
	"Object.prototype.__lookupGetter__",
	"Object.prototype.__lookupSetter__",

	// Constructor property can be abused to retrieve the Function constructor
	"Object.prototype.constructor",
];

const dangerousMethods = [
	"Object.getPrototypeOf",
	// Various reflective/object-inspection APIs that may expose internals
	"Object.getOwnPropertyDescriptor",
	"Object.getOwnPropertyDescriptors",
	"Object.getOwnPropertyNames",
	"Object.getOwnPropertySymbols",
	"Object.getOwnPropertyDescriptors",
];

// Some prototype-style aliases/properties that can be used to break sandboxes
mutableMethods.push("Object.prototype.__proto__");

/**
 * List of methods to block due to mutability or dangerousness
 */
export const blockedMethods = [...mutableMethods, ...dangerousMethods];

/**
 * List of global built-ins to block entirely
 */
export const blockedGlobalBuiltIns = [
	"Function",
	"GeneratorFunction",
	"AsyncFunction",
	"AsyncGeneratorFunction",
	"eval",
	"setTimeout",
	"setInterval",
	"clearTimeout",
	"clearInterval",
	"setImmediate",
	"XMLHttpRequest",
	"fetch",
	"WebSocket",
	"globalThis",

	// Node / runtime globals
	"process",
	"require",
	"module",
	"exports",
	"global",
	"Buffer",
	"setImmediate",
	"clearImmediate",

	// Worker / threading / messaging
	"importScripts",
	"Worker",
	"SharedWorker",
	"ServiceWorker",
	"BroadcastChannel",
	"MessageChannel",
	"MessagePort",
	"postMessage",

	// Host environment globals (browser)
	"window",
	"document",
	"navigator",
	"location",
	"localStorage",
	"sessionStorage",
	"indexedDB",
	"performance",

	// Low-level / concurrent / binary APIs
	"Proxy",
	"Reflect",
	"Atomics",
	"WebAssembly",

	// Console and internationalization
	"console",
	"Intl",

	// Other runtimes
	"Deno",
];
