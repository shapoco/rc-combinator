//import { createRequire } from "node:module";

//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = null; ///* @__PURE__ */ createRequire(import.meta.url);

//#endregion
//#region ../../lib/cpp_wasm/build/rcmb_wasm.js
var require_rcmb_wasm = /* @__PURE__ */ __commonJS({ "../../lib/cpp_wasm/build/rcmb_wasm.js": ((exports, module) => {
	var createRcmbWasm$1 = (() => {
		var _scriptName = globalThis.document?.currentScript?.src;
		return async function(moduleArg = {}) {
			var moduleRtn;
			var Module = moduleArg;
			var ENVIRONMENT_IS_WEB = !!globalThis.window;
			var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
			var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";
			if (typeof __filename != "undefined") _scriptName = __filename;
			else if (ENVIRONMENT_IS_WORKER) _scriptName = self.location.href;
			var scriptDirectory = "";
			function locateFile(path) {
				if (Module["locateFile"]) return Module["locateFile"](path, scriptDirectory);
				return scriptDirectory + path;
			}
			var readAsync, readBinary;
			if (ENVIRONMENT_IS_NODE) {
				var fs = __require("fs");
				scriptDirectory = __dirname + "/";
				readBinary = (filename) => {
					filename = isFileURI(filename) ? new URL(filename) : filename;
					return fs.readFileSync(filename);
				};
				readAsync = async (filename, binary = true) => {
					filename = isFileURI(filename) ? new URL(filename) : filename;
					return fs.readFileSync(filename, binary ? void 0 : "utf8");
				};
				if (process.argv.length > 1) process.argv[1].replace(/\\/g, "/");
				process.argv.slice(2);
			} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
				try {
					scriptDirectory = new URL(".", _scriptName).href;
				} catch {}
				if (ENVIRONMENT_IS_WORKER) readBinary = (url) => {
					var xhr = new XMLHttpRequest();
					xhr.open("GET", url, false);
					xhr.responseType = "arraybuffer";
					xhr.send(null);
					return new Uint8Array(xhr.response);
				};
				readAsync = async (url) => {
					if (isFileURI(url)) return new Promise((resolve, reject) => {
						var xhr = new XMLHttpRequest();
						xhr.open("GET", url, true);
						xhr.responseType = "arraybuffer";
						xhr.onload = () => {
							if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
								resolve(xhr.response);
								return;
							}
							reject(xhr.status);
						};
						xhr.onerror = reject;
						xhr.send(null);
					});
					var response = await fetch(url, { credentials: "same-origin" });
					if (response.ok) return response.arrayBuffer();
					throw new Error(response.status + " : " + response.url);
				};
			}
			console.log.bind(console);
			var err = console.error.bind(console);
			var wasmBinary;
			var ABORT = false;
			var isFileURI = (filename) => filename.startsWith("file://");
			var readyPromiseResolve, readyPromiseReject;
			var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
			var HEAP64, HEAPU64;
			var runtimeInitialized = false;
			function updateMemoryViews() {
				var b = wasmMemory.buffer;
				HEAP8 = new Int8Array(b);
				HEAP16 = new Int16Array(b);
				HEAPU8 = new Uint8Array(b);
				HEAPU16 = new Uint16Array(b);
				HEAP32 = new Int32Array(b);
				HEAPU32 = new Uint32Array(b);
				HEAPF32 = new Float32Array(b);
				HEAPF64 = new Float64Array(b);
				HEAP64 = new BigInt64Array(b);
				HEAPU64 = new BigUint64Array(b);
			}
			function preRun() {
				if (Module["preRun"]) {
					if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
					while (Module["preRun"].length) addOnPreRun(Module["preRun"].shift());
				}
				callRuntimeCallbacks(onPreRuns);
			}
			function initRuntime() {
				runtimeInitialized = true;
				wasmExports["v"]();
			}
			function postRun() {
				if (Module["postRun"]) {
					if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
					while (Module["postRun"].length) addOnPostRun(Module["postRun"].shift());
				}
				callRuntimeCallbacks(onPostRuns);
			}
			function abort(what) {
				Module["onAbort"]?.(what);
				what = "Aborted(" + what + ")";
				err(what);
				ABORT = true;
				what += ". Build with -sASSERTIONS for more info.";
				var e = new WebAssembly.RuntimeError(what);
				readyPromiseReject?.(e);
				throw e;
			}
			var wasmBinaryFile;
			function findWasmBinary() {
				return locateFile("rcmb_wasm.wasm?634ca5d4");
			}
			function getBinarySync(file) {
				if (file == wasmBinaryFile && wasmBinary) return new Uint8Array(wasmBinary);
				if (readBinary) return readBinary(file);
				throw "both async and sync fetching of the wasm failed";
			}
			async function getWasmBinary(binaryFile) {
				if (!wasmBinary) try {
					var response = await readAsync(binaryFile);
					return new Uint8Array(response);
				} catch {}
				return getBinarySync(binaryFile);
			}
			async function instantiateArrayBuffer(binaryFile, imports) {
				try {
					var binary = await getWasmBinary(binaryFile);
					return await WebAssembly.instantiate(binary, imports);
				} catch (reason) {
					err(`failed to asynchronously prepare wasm: ${reason}`);
					abort(reason);
				}
			}
			async function instantiateAsync(binary, binaryFile, imports) {
				if (!binary && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) try {
					var response = fetch(binaryFile, { credentials: "same-origin" });
					return await WebAssembly.instantiateStreaming(response, imports);
				} catch (reason) {
					err(`wasm streaming compile failed: ${reason}`);
					err("falling back to ArrayBuffer instantiation");
				}
				return instantiateArrayBuffer(binaryFile, imports);
			}
			function getWasmImports() {
				return { a: wasmImports };
			}
			async function createWasm() {
				function receiveInstance(instance, module$1) {
					wasmExports = instance.exports;
					assignWasmExports(wasmExports);
					updateMemoryViews();
					return wasmExports;
				}
				function receiveInstantiationResult(result) {
					return receiveInstance(result["instance"]);
				}
				var info = getWasmImports();
				if (Module["instantiateWasm"]) return new Promise((resolve, reject) => {
					Module["instantiateWasm"](info, (inst, mod) => {
						resolve(receiveInstance(inst, mod));
					});
				});
				wasmBinaryFile ??= findWasmBinary();
				return receiveInstantiationResult(await instantiateAsync(wasmBinary, wasmBinaryFile, info));
			}
			var callRuntimeCallbacks = (callbacks) => {
				while (callbacks.length > 0) callbacks.shift()(Module);
			};
			var onPostRuns = [];
			var addOnPostRun = (cb) => onPostRuns.push(cb);
			var onPreRuns = [];
			var addOnPreRun = (cb) => onPreRuns.push(cb);
			class ExceptionInfo {
				constructor(excPtr) {
					this.excPtr = excPtr;
					this.ptr = excPtr - 24;
				}
				set_type(type) {
					HEAPU32[this.ptr + 4 >> 2] = type;
				}
				get_type() {
					return HEAPU32[this.ptr + 4 >> 2];
				}
				set_destructor(destructor) {
					HEAPU32[this.ptr + 8 >> 2] = destructor;
				}
				get_destructor() {
					return HEAPU32[this.ptr + 8 >> 2];
				}
				set_caught(caught) {
					caught = caught ? 1 : 0;
					HEAP8[this.ptr + 12] = caught;
				}
				get_caught() {
					return HEAP8[this.ptr + 12] != 0;
				}
				set_rethrown(rethrown) {
					rethrown = rethrown ? 1 : 0;
					HEAP8[this.ptr + 13] = rethrown;
				}
				get_rethrown() {
					return HEAP8[this.ptr + 13] != 0;
				}
				init(type, destructor) {
					this.set_adjusted_ptr(0);
					this.set_type(type);
					this.set_destructor(destructor);
				}
				set_adjusted_ptr(adjustedPtr) {
					HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
				}
				get_adjusted_ptr() {
					return HEAPU32[this.ptr + 16 >> 2];
				}
			}
			var exceptionLast = 0;
			var uncaughtExceptionCount = 0;
			var ___cxa_throw = (ptr, type, destructor) => {
				new ExceptionInfo(ptr).init(type, destructor);
				exceptionLast = ptr;
				uncaughtExceptionCount++;
				throw exceptionLast;
			};
			var __abort_js = () => abort("");
			var AsciiToString = (ptr) => {
				var str = "";
				while (1) {
					var ch = HEAPU8[ptr++];
					if (!ch) return str;
					str += String.fromCharCode(ch);
				}
			};
			var awaitingDependencies = {};
			var registeredTypes = {};
			var typeDependencies = {};
			var BindingError = class BindingError$1 extends Error {
				constructor(message) {
					super(message);
					this.name = "BindingError";
				}
			};
			var throwBindingError = (message) => {
				throw new BindingError(message);
			};
			function sharedRegisterType(rawType, registeredInstance, options = {}) {
				var name = registeredInstance.name;
				if (!rawType) throwBindingError(`type "${name}" must have a positive integer typeid pointer`);
				if (registeredTypes.hasOwnProperty(rawType)) if (options.ignoreDuplicateRegistrations) return;
				else throwBindingError(`Cannot register type '${name}' twice`);
				registeredTypes[rawType] = registeredInstance;
				delete typeDependencies[rawType];
				if (awaitingDependencies.hasOwnProperty(rawType)) {
					var callbacks = awaitingDependencies[rawType];
					delete awaitingDependencies[rawType];
					callbacks.forEach((cb) => cb());
				}
			}
			function registerType(rawType, registeredInstance, options = {}) {
				return sharedRegisterType(rawType, registeredInstance, options);
			}
			var integerReadValueFromPointer = (name, width, signed) => {
				switch (width) {
					case 1: return signed ? (pointer) => HEAP8[pointer] : (pointer) => HEAPU8[pointer];
					case 2: return signed ? (pointer) => HEAP16[pointer >> 1] : (pointer) => HEAPU16[pointer >> 1];
					case 4: return signed ? (pointer) => HEAP32[pointer >> 2] : (pointer) => HEAPU32[pointer >> 2];
					case 8: return signed ? (pointer) => HEAP64[pointer >> 3] : (pointer) => HEAPU64[pointer >> 3];
					default: throw new TypeError(`invalid integer width (${width}): ${name}`);
				}
			};
			var __embind_register_bigint = (primitiveType, name, size, minRange, maxRange) => {
				name = AsciiToString(name);
				const isUnsignedType = minRange === 0n;
				let fromWireType = (value) => value;
				if (isUnsignedType) {
					const bitSize = size * 8;
					fromWireType = (value) => BigInt.asUintN(bitSize, value);
					maxRange = fromWireType(maxRange);
				}
				registerType(primitiveType, {
					name,
					fromWireType,
					toWireType: (destructors, value) => {
						if (typeof value == "number") value = BigInt(value);
						return value;
					},
					readValueFromPointer: integerReadValueFromPointer(name, size, !isUnsignedType),
					destructorFunction: null
				});
			};
			var __embind_register_bool = (rawType, name, trueValue, falseValue) => {
				name = AsciiToString(name);
				registerType(rawType, {
					name,
					fromWireType: function(wt) {
						return !!wt;
					},
					toWireType: function(destructors, o) {
						return o ? trueValue : falseValue;
					},
					readValueFromPointer: function(pointer) {
						return this.fromWireType(HEAPU8[pointer]);
					},
					destructorFunction: null
				});
			};
			var shallowCopyInternalPointer = (o) => ({
				count: o.count,
				deleteScheduled: o.deleteScheduled,
				preservePointerOnDelete: o.preservePointerOnDelete,
				ptr: o.ptr,
				ptrType: o.ptrType,
				smartPtr: o.smartPtr,
				smartPtrType: o.smartPtrType
			});
			var throwInstanceAlreadyDeleted = (obj) => {
				function getInstanceTypeName(handle) {
					return handle.$$.ptrType.registeredClass.name;
				}
				throwBindingError(getInstanceTypeName(obj) + " instance already deleted");
			};
			var finalizationRegistry = false;
			var detachFinalizer = (handle) => {};
			var runDestructor = ($$) => {
				if ($$.smartPtr) $$.smartPtrType.rawDestructor($$.smartPtr);
				else $$.ptrType.registeredClass.rawDestructor($$.ptr);
			};
			var releaseClassHandle = ($$) => {
				$$.count.value -= 1;
				if (0 === $$.count.value) runDestructor($$);
			};
			var attachFinalizer = (handle) => {
				if (!globalThis.FinalizationRegistry) {
					attachFinalizer = (handle$1) => handle$1;
					return handle;
				}
				finalizationRegistry = new FinalizationRegistry((info) => {
					releaseClassHandle(info.$$);
				});
				attachFinalizer = (handle$1) => {
					var $$ = handle$1.$$;
					if (!!$$.smartPtr) {
						var info = { $$ };
						finalizationRegistry.register(handle$1, info, handle$1);
					}
					return handle$1;
				};
				detachFinalizer = (handle$1) => finalizationRegistry.unregister(handle$1);
				return attachFinalizer(handle);
			};
			var deletionQueue = [];
			var flushPendingDeletes = () => {
				while (deletionQueue.length) {
					var obj = deletionQueue.pop();
					obj.$$.deleteScheduled = false;
					obj["delete"]();
				}
			};
			var delayFunction;
			var init_ClassHandle = () => {
				let proto = ClassHandle.prototype;
				Object.assign(proto, {
					isAliasOf(other) {
						if (!(this instanceof ClassHandle)) return false;
						if (!(other instanceof ClassHandle)) return false;
						var leftClass = this.$$.ptrType.registeredClass;
						var left = this.$$.ptr;
						other.$$ = other.$$;
						var rightClass = other.$$.ptrType.registeredClass;
						var right = other.$$.ptr;
						while (leftClass.baseClass) {
							left = leftClass.upcast(left);
							leftClass = leftClass.baseClass;
						}
						while (rightClass.baseClass) {
							right = rightClass.upcast(right);
							rightClass = rightClass.baseClass;
						}
						return leftClass === rightClass && left === right;
					},
					clone() {
						if (!this.$$.ptr) throwInstanceAlreadyDeleted(this);
						if (this.$$.preservePointerOnDelete) {
							this.$$.count.value += 1;
							return this;
						} else {
							var clone = attachFinalizer(Object.create(Object.getPrototypeOf(this), { $$: { value: shallowCopyInternalPointer(this.$$) } }));
							clone.$$.count.value += 1;
							clone.$$.deleteScheduled = false;
							return clone;
						}
					},
					delete() {
						if (!this.$$.ptr) throwInstanceAlreadyDeleted(this);
						if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) throwBindingError("Object already scheduled for deletion");
						detachFinalizer(this);
						releaseClassHandle(this.$$);
						if (!this.$$.preservePointerOnDelete) {
							this.$$.smartPtr = void 0;
							this.$$.ptr = void 0;
						}
					},
					isDeleted() {
						return !this.$$.ptr;
					},
					deleteLater() {
						if (!this.$$.ptr) throwInstanceAlreadyDeleted(this);
						if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) throwBindingError("Object already scheduled for deletion");
						deletionQueue.push(this);
						if (deletionQueue.length === 1 && delayFunction) delayFunction(flushPendingDeletes);
						this.$$.deleteScheduled = true;
						return this;
					}
				});
				const symbolDispose = Symbol.dispose;
				if (symbolDispose) proto[symbolDispose] = proto["delete"];
			};
			function ClassHandle() {}
			var createNamedFunction = (name, func) => Object.defineProperty(func, "name", { value: name });
			var registeredPointers = {};
			var ensureOverloadTable = (proto, methodName, humanName) => {
				if (void 0 === proto[methodName].overloadTable) {
					var prevFunc = proto[methodName];
					proto[methodName] = function(...args) {
						if (!proto[methodName].overloadTable.hasOwnProperty(args.length)) throwBindingError(`Function '${humanName}' called with an invalid number of arguments (${args.length}) - expects one of (${proto[methodName].overloadTable})!`);
						return proto[methodName].overloadTable[args.length].apply(this, args);
					};
					proto[methodName].overloadTable = [];
					proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
				}
			};
			var exposePublicSymbol = (name, value, numArguments) => {
				if (Module.hasOwnProperty(name)) {
					if (void 0 === numArguments || void 0 !== Module[name].overloadTable && void 0 !== Module[name].overloadTable[numArguments]) throwBindingError(`Cannot register public name '${name}' twice`);
					ensureOverloadTable(Module, name, name);
					if (Module[name].overloadTable.hasOwnProperty(numArguments)) throwBindingError(`Cannot register multiple overloads of a function with the same number of arguments (${numArguments})!`);
					Module[name].overloadTable[numArguments] = value;
				} else {
					Module[name] = value;
					Module[name].argCount = numArguments;
				}
			};
			var char_0 = 48;
			var char_9 = 57;
			var makeLegalFunctionName = (name) => {
				name = name.replace(/[^a-zA-Z0-9_]/g, "$");
				var f = name.charCodeAt(0);
				if (f >= char_0 && f <= char_9) return `_${name}`;
				return name;
			};
			function RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast) {
				this.name = name;
				this.constructor = constructor;
				this.instancePrototype = instancePrototype;
				this.rawDestructor = rawDestructor;
				this.baseClass = baseClass;
				this.getActualType = getActualType;
				this.upcast = upcast;
				this.downcast = downcast;
				this.pureVirtualFunctions = [];
			}
			var upcastPointer = (ptr, ptrClass, desiredClass) => {
				while (ptrClass !== desiredClass) {
					if (!ptrClass.upcast) throwBindingError(`Expected null or instance of ${desiredClass.name}, got an instance of ${ptrClass.name}`);
					ptr = ptrClass.upcast(ptr);
					ptrClass = ptrClass.baseClass;
				}
				return ptr;
			};
			var embindRepr = (v) => {
				if (v === null) return "null";
				var t = typeof v;
				if (t === "object" || t === "array" || t === "function") return v.toString();
				else return "" + v;
			};
			function constNoSmartPtrRawPointerToWireType(destructors, handle) {
				if (handle === null) {
					if (this.isReference) throwBindingError(`null is not a valid ${this.name}`);
					return 0;
				}
				if (!handle.$$) throwBindingError(`Cannot pass "${embindRepr(handle)}" as a ${this.name}`);
				if (!handle.$$.ptr) throwBindingError(`Cannot pass deleted object as a pointer of type ${this.name}`);
				var handleClass = handle.$$.ptrType.registeredClass;
				return upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
			}
			function genericPointerToWireType(destructors, handle) {
				var ptr;
				if (handle === null) {
					if (this.isReference) throwBindingError(`null is not a valid ${this.name}`);
					if (this.isSmartPointer) {
						ptr = this.rawConstructor();
						if (destructors !== null) destructors.push(this.rawDestructor, ptr);
						return ptr;
					} else return 0;
				}
				if (!handle || !handle.$$) throwBindingError(`Cannot pass "${embindRepr(handle)}" as a ${this.name}`);
				if (!handle.$$.ptr) throwBindingError(`Cannot pass deleted object as a pointer of type ${this.name}`);
				if (!this.isConst && handle.$$.ptrType.isConst) throwBindingError(`Cannot convert argument of type ${handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name} to parameter type ${this.name}`);
				var handleClass = handle.$$.ptrType.registeredClass;
				ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
				if (this.isSmartPointer) {
					if (void 0 === handle.$$.smartPtr) throwBindingError("Passing raw pointer to smart pointer is illegal");
					switch (this.sharingPolicy) {
						case 0:
							if (handle.$$.smartPtrType === this) ptr = handle.$$.smartPtr;
							else throwBindingError(`Cannot convert argument of type ${handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name} to parameter type ${this.name}`);
							break;
						case 1:
							ptr = handle.$$.smartPtr;
							break;
						case 2:
							if (handle.$$.smartPtrType === this) ptr = handle.$$.smartPtr;
							else {
								var clonedHandle = handle["clone"]();
								ptr = this.rawShare(ptr, Emval.toHandle(() => clonedHandle["delete"]()));
								if (destructors !== null) destructors.push(this.rawDestructor, ptr);
							}
							break;
						default: throwBindingError("Unsupporting sharing policy");
					}
				}
				return ptr;
			}
			function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
				if (handle === null) {
					if (this.isReference) throwBindingError(`null is not a valid ${this.name}`);
					return 0;
				}
				if (!handle.$$) throwBindingError(`Cannot pass "${embindRepr(handle)}" as a ${this.name}`);
				if (!handle.$$.ptr) throwBindingError(`Cannot pass deleted object as a pointer of type ${this.name}`);
				if (handle.$$.ptrType.isConst) throwBindingError(`Cannot convert argument of type ${handle.$$.ptrType.name} to parameter type ${this.name}`);
				var handleClass = handle.$$.ptrType.registeredClass;
				return upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
			}
			function readPointer(pointer) {
				return this.fromWireType(HEAPU32[pointer >> 2]);
			}
			var downcastPointer = (ptr, ptrClass, desiredClass) => {
				if (ptrClass === desiredClass) return ptr;
				if (void 0 === desiredClass.baseClass) return null;
				var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
				if (rv === null) return null;
				return desiredClass.downcast(rv);
			};
			var registeredInstances = {};
			var getBasestPointer = (class_, ptr) => {
				if (ptr === void 0) throwBindingError("ptr should not be undefined");
				while (class_.baseClass) {
					ptr = class_.upcast(ptr);
					class_ = class_.baseClass;
				}
				return ptr;
			};
			var getInheritedInstance = (class_, ptr) => {
				ptr = getBasestPointer(class_, ptr);
				return registeredInstances[ptr];
			};
			var InternalError = class InternalError$1 extends Error {
				constructor(message) {
					super(message);
					this.name = "InternalError";
				}
			};
			var throwInternalError = (message) => {
				throw new InternalError(message);
			};
			var makeClassHandle = (prototype, record) => {
				if (!record.ptrType || !record.ptr) throwInternalError("makeClassHandle requires ptr and ptrType");
				if (!!record.smartPtrType !== !!record.smartPtr) throwInternalError("Both smartPtrType and smartPtr must be specified");
				record.count = { value: 1 };
				return attachFinalizer(Object.create(prototype, { $$: {
					value: record,
					writable: true
				} }));
			};
			function RegisteredPointer_fromWireType(ptr) {
				var rawPointer = this.getPointee(ptr);
				if (!rawPointer) {
					this.destructor(ptr);
					return null;
				}
				var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
				if (void 0 !== registeredInstance) if (0 === registeredInstance.$$.count.value) {
					registeredInstance.$$.ptr = rawPointer;
					registeredInstance.$$.smartPtr = ptr;
					return registeredInstance["clone"]();
				} else {
					var rv = registeredInstance["clone"]();
					this.destructor(ptr);
					return rv;
				}
				function makeDefaultHandle() {
					if (this.isSmartPointer) return makeClassHandle(this.registeredClass.instancePrototype, {
						ptrType: this.pointeeType,
						ptr: rawPointer,
						smartPtrType: this,
						smartPtr: ptr
					});
					else return makeClassHandle(this.registeredClass.instancePrototype, {
						ptrType: this,
						ptr
					});
				}
				var registeredPointerRecord = registeredPointers[this.registeredClass.getActualType(rawPointer)];
				if (!registeredPointerRecord) return makeDefaultHandle.call(this);
				var toType;
				if (this.isConst) toType = registeredPointerRecord.constPointerType;
				else toType = registeredPointerRecord.pointerType;
				var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
				if (dp === null) return makeDefaultHandle.call(this);
				if (this.isSmartPointer) return makeClassHandle(toType.registeredClass.instancePrototype, {
					ptrType: toType,
					ptr: dp,
					smartPtrType: this,
					smartPtr: ptr
				});
				else return makeClassHandle(toType.registeredClass.instancePrototype, {
					ptrType: toType,
					ptr: dp
				});
			}
			var init_RegisteredPointer = () => {
				Object.assign(RegisteredPointer.prototype, {
					getPointee(ptr) {
						if (this.rawGetPointee) ptr = this.rawGetPointee(ptr);
						return ptr;
					},
					destructor(ptr) {
						this.rawDestructor?.(ptr);
					},
					readValueFromPointer: readPointer,
					fromWireType: RegisteredPointer_fromWireType
				});
			};
			function RegisteredPointer(name, registeredClass, isReference, isConst, isSmartPointer, pointeeType, sharingPolicy, rawGetPointee, rawConstructor, rawShare, rawDestructor) {
				this.name = name;
				this.registeredClass = registeredClass;
				this.isReference = isReference;
				this.isConst = isConst;
				this.isSmartPointer = isSmartPointer;
				this.pointeeType = pointeeType;
				this.sharingPolicy = sharingPolicy;
				this.rawGetPointee = rawGetPointee;
				this.rawConstructor = rawConstructor;
				this.rawShare = rawShare;
				this.rawDestructor = rawDestructor;
				if (!isSmartPointer && registeredClass.baseClass === void 0) if (isConst) {
					this.toWireType = constNoSmartPtrRawPointerToWireType;
					this.destructorFunction = null;
				} else {
					this.toWireType = nonConstNoSmartPtrRawPointerToWireType;
					this.destructorFunction = null;
				}
				else this.toWireType = genericPointerToWireType;
			}
			var replacePublicSymbol = (name, value, numArguments) => {
				if (!Module.hasOwnProperty(name)) throwInternalError("Replacing nonexistent public symbol");
				if (void 0 !== Module[name].overloadTable && void 0 !== numArguments) Module[name].overloadTable[numArguments] = value;
				else {
					Module[name] = value;
					Module[name].argCount = numArguments;
				}
			};
			var wasmTableMirror = [];
			var getWasmTableEntry = (funcPtr) => {
				var func = wasmTableMirror[funcPtr];
				if (!func) wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
				return func;
			};
			var embind__requireFunction = (signature, rawFunction, isAsync = false) => {
				signature = AsciiToString(signature);
				function makeDynCaller() {
					return getWasmTableEntry(rawFunction);
				}
				var fp = makeDynCaller();
				if (typeof fp != "function") throwBindingError(`unknown function pointer with signature ${signature}: ${rawFunction}`);
				return fp;
			};
			class UnboundTypeError extends Error {}
			var getTypeName = (type) => {
				var ptr = ___getTypeName(type);
				var rv = AsciiToString(ptr);
				_free(ptr);
				return rv;
			};
			var throwUnboundTypeError = (message, types) => {
				var unboundTypes = [];
				var seen = {};
				function visit(type) {
					if (seen[type]) return;
					if (registeredTypes[type]) return;
					if (typeDependencies[type]) {
						typeDependencies[type].forEach(visit);
						return;
					}
					unboundTypes.push(type);
					seen[type] = true;
				}
				types.forEach(visit);
				throw new UnboundTypeError(`${message}: ` + unboundTypes.map(getTypeName).join([", "]));
			};
			var whenDependentTypesAreResolved = (myTypes, dependentTypes, getTypeConverters) => {
				myTypes.forEach((type) => typeDependencies[type] = dependentTypes);
				function onComplete(typeConverters$1) {
					var myTypeConverters = getTypeConverters(typeConverters$1);
					if (myTypeConverters.length !== myTypes.length) throwInternalError("Mismatched type converter count");
					for (var i = 0; i < myTypes.length; ++i) registerType(myTypes[i], myTypeConverters[i]);
				}
				var typeConverters = new Array(dependentTypes.length);
				var unregisteredTypes = [];
				var registered = 0;
				dependentTypes.forEach((dt, i) => {
					if (registeredTypes.hasOwnProperty(dt)) typeConverters[i] = registeredTypes[dt];
					else {
						unregisteredTypes.push(dt);
						if (!awaitingDependencies.hasOwnProperty(dt)) awaitingDependencies[dt] = [];
						awaitingDependencies[dt].push(() => {
							typeConverters[i] = registeredTypes[dt];
							++registered;
							if (registered === unregisteredTypes.length) onComplete(typeConverters);
						});
					}
				});
				if (0 === unregisteredTypes.length) onComplete(typeConverters);
			};
			var __embind_register_class = (rawType, rawPointerType, rawConstPointerType, baseClassRawType, getActualTypeSignature, getActualType, upcastSignature, upcast, downcastSignature, downcast, name, destructorSignature, rawDestructor) => {
				name = AsciiToString(name);
				getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
				upcast &&= embind__requireFunction(upcastSignature, upcast);
				downcast &&= embind__requireFunction(downcastSignature, downcast);
				rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
				var legalFunctionName = makeLegalFunctionName(name);
				exposePublicSymbol(legalFunctionName, function() {
					throwUnboundTypeError(`Cannot construct ${name} due to unbound types`, [baseClassRawType]);
				});
				whenDependentTypesAreResolved([
					rawType,
					rawPointerType,
					rawConstPointerType
				], baseClassRawType ? [baseClassRawType] : [], (base) => {
					base = base[0];
					var baseClass;
					var basePrototype;
					if (baseClassRawType) {
						baseClass = base.registeredClass;
						basePrototype = baseClass.instancePrototype;
					} else basePrototype = ClassHandle.prototype;
					var constructor = createNamedFunction(name, function(...args) {
						if (Object.getPrototypeOf(this) !== instancePrototype) throw new BindingError(`Use 'new' to construct ${name}`);
						if (void 0 === registeredClass.constructor_body) throw new BindingError(`${name} has no accessible constructor`);
						var body = registeredClass.constructor_body[args.length];
						if (void 0 === body) throw new BindingError(`Tried to invoke ctor of ${name} with invalid number of parameters (${args.length}) - expected (${Object.keys(registeredClass.constructor_body).toString()}) parameters instead!`);
						return body.apply(this, args);
					});
					var instancePrototype = Object.create(basePrototype, { constructor: { value: constructor } });
					constructor.prototype = instancePrototype;
					var registeredClass = new RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast);
					if (registeredClass.baseClass) {
						registeredClass.baseClass.__derivedClasses ??= [];
						registeredClass.baseClass.__derivedClasses.push(registeredClass);
					}
					var referenceConverter = new RegisteredPointer(name, registeredClass, true, false, false);
					var pointerConverter = new RegisteredPointer(name + "*", registeredClass, false, false, false);
					var constPointerConverter = new RegisteredPointer(name + " const*", registeredClass, false, true, false);
					registeredPointers[rawType] = {
						pointerType: pointerConverter,
						constPointerType: constPointerConverter
					};
					replacePublicSymbol(legalFunctionName, constructor);
					return [
						referenceConverter,
						pointerConverter,
						constPointerConverter
					];
				});
			};
			var heap32VectorToArray = (count, firstElement) => {
				var array = [];
				for (var i = 0; i < count; i++) array.push(HEAPU32[firstElement + i * 4 >> 2]);
				return array;
			};
			var runDestructors = (destructors) => {
				while (destructors.length) {
					var ptr = destructors.pop();
					destructors.pop()(ptr);
				}
			};
			function usesDestructorStack(argTypes) {
				for (var i = 1; i < argTypes.length; ++i) if (argTypes[i] !== null && argTypes[i].destructorFunction === void 0) return true;
				return false;
			}
			function createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync) {
				var needsDestructorStack = usesDestructorStack(argTypes);
				var argCount = argTypes.length - 2;
				var argsList = [];
				var argsListWired = ["fn"];
				if (isClassMethodFunc) argsListWired.push("thisWired");
				for (var i = 0; i < argCount; ++i) {
					argsList.push(`arg${i}`);
					argsListWired.push(`arg${i}Wired`);
				}
				argsList = argsList.join(",");
				argsListWired = argsListWired.join(",");
				var invokerFnBody = `return function (${argsList}) {\n`;
				if (needsDestructorStack) invokerFnBody += "var destructors = [];\n";
				var dtorStack = needsDestructorStack ? "destructors" : "null";
				var args1 = [
					"humanName",
					"throwBindingError",
					"invoker",
					"fn",
					"runDestructors",
					"fromRetWire",
					"toClassParamWire"
				];
				if (isClassMethodFunc) invokerFnBody += `var thisWired = toClassParamWire(${dtorStack}, this);\n`;
				for (var i = 0; i < argCount; ++i) {
					var argName = `toArg${i}Wire`;
					invokerFnBody += `var arg${i}Wired = ${argName}(${dtorStack}, arg${i});\n`;
					args1.push(argName);
				}
				invokerFnBody += (returns || isAsync ? "var rv = " : "") + `invoker(${argsListWired});\n`;
				if (needsDestructorStack) invokerFnBody += "runDestructors(destructors);\n";
				else for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
					var paramName = i === 1 ? "thisWired" : "arg" + (i - 2) + "Wired";
					if (argTypes[i].destructorFunction !== null) {
						invokerFnBody += `${paramName}_dtor(${paramName});\n`;
						args1.push(`${paramName}_dtor`);
					}
				}
				if (returns) invokerFnBody += "var ret = fromRetWire(rv);\nreturn ret;\n";
				invokerFnBody += "}\n";
				return new Function(args1, invokerFnBody);
			}
			function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc, isAsync) {
				var argCount = argTypes.length;
				if (argCount < 2) throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
				var isClassMethodFunc = argTypes[1] !== null && classType !== null;
				var needsDestructorStack = usesDestructorStack(argTypes);
				var returns = !argTypes[0].isVoid;
				var retType = argTypes[0];
				var instType = argTypes[1];
				var closureArgs = [
					humanName,
					throwBindingError,
					cppInvokerFunc,
					cppTargetFunc,
					runDestructors,
					retType.fromWireType.bind(retType),
					instType?.toWireType.bind(instType)
				];
				for (var i = 2; i < argCount; ++i) {
					var argType = argTypes[i];
					closureArgs.push(argType.toWireType.bind(argType));
				}
				if (!needsDestructorStack) {
					for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) if (argTypes[i].destructorFunction !== null) closureArgs.push(argTypes[i].destructorFunction);
				}
				return createNamedFunction(humanName, createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync)(...closureArgs));
			}
			var __embind_register_class_constructor = (rawClassType, argCount, rawArgTypesAddr, invokerSignature, invoker, rawConstructor) => {
				var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
				invoker = embind__requireFunction(invokerSignature, invoker);
				whenDependentTypesAreResolved([], [rawClassType], (classType) => {
					classType = classType[0];
					var humanName = `constructor ${classType.name}`;
					if (void 0 === classType.registeredClass.constructor_body) classType.registeredClass.constructor_body = [];
					if (void 0 !== classType.registeredClass.constructor_body[argCount - 1]) throw new BindingError(`Cannot register multiple constructors with identical number of parameters (${argCount - 1}) for class '${classType.name}'! Overload resolution is currently only performed using the parameter count, not actual type info!`);
					classType.registeredClass.constructor_body[argCount - 1] = () => {
						throwUnboundTypeError(`Cannot construct ${classType.name} due to unbound types`, rawArgTypes);
					};
					whenDependentTypesAreResolved([], rawArgTypes, (argTypes) => {
						argTypes.splice(1, 0, null);
						classType.registeredClass.constructor_body[argCount - 1] = craftInvokerFunction(humanName, argTypes, null, invoker, rawConstructor);
						return [];
					});
					return [];
				});
			};
			var getFunctionName = (signature) => {
				signature = signature.trim();
				const argsIndex = signature.indexOf("(");
				if (argsIndex === -1) return signature;
				return signature.slice(0, argsIndex);
			};
			var __embind_register_class_function = (rawClassType, methodName, argCount, rawArgTypesAddr, invokerSignature, rawInvoker, context, isPureVirtual, isAsync, isNonnullReturn) => {
				var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
				methodName = AsciiToString(methodName);
				methodName = getFunctionName(methodName);
				rawInvoker = embind__requireFunction(invokerSignature, rawInvoker, isAsync);
				whenDependentTypesAreResolved([], [rawClassType], (classType) => {
					classType = classType[0];
					var humanName = `${classType.name}.${methodName}`;
					if (methodName.startsWith("@@")) methodName = Symbol[methodName.substring(2)];
					if (isPureVirtual) classType.registeredClass.pureVirtualFunctions.push(methodName);
					function unboundTypesHandler() {
						throwUnboundTypeError(`Cannot call ${humanName} due to unbound types`, rawArgTypes);
					}
					var proto = classType.registeredClass.instancePrototype;
					var method = proto[methodName];
					if (void 0 === method || void 0 === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2) {
						unboundTypesHandler.argCount = argCount - 2;
						unboundTypesHandler.className = classType.name;
						proto[methodName] = unboundTypesHandler;
					} else {
						ensureOverloadTable(proto, methodName, humanName);
						proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
					}
					whenDependentTypesAreResolved([], rawArgTypes, (argTypes) => {
						var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context, isAsync);
						if (void 0 === proto[methodName].overloadTable) {
							memberFunction.argCount = argCount - 2;
							proto[methodName] = memberFunction;
						} else proto[methodName].overloadTable[argCount - 2] = memberFunction;
						return [];
					});
					return [];
				});
			};
			var emval_freelist = [];
			var emval_handles = [
				0,
				1,
				,
				1,
				null,
				1,
				true,
				1,
				false,
				1
			];
			var __emval_decref = (handle) => {
				if (handle > 9 && 0 === --emval_handles[handle + 1]) {
					emval_handles[handle] = void 0;
					emval_freelist.push(handle);
				}
			};
			var Emval = {
				toValue: (handle) => {
					if (!handle) throwBindingError(`Cannot use deleted val. handle = ${handle}`);
					return emval_handles[handle];
				},
				toHandle: (value) => {
					switch (value) {
						case void 0: return 2;
						case null: return 4;
						case true: return 6;
						case false: return 8;
						default: {
							const handle = emval_freelist.pop() || emval_handles.length;
							emval_handles[handle] = value;
							emval_handles[handle + 1] = 1;
							return handle;
						}
					}
				}
			};
			var EmValType = {
				name: "emscripten::val",
				fromWireType: (handle) => {
					var rv = Emval.toValue(handle);
					__emval_decref(handle);
					return rv;
				},
				toWireType: (destructors, value) => Emval.toHandle(value),
				readValueFromPointer: readPointer,
				destructorFunction: null
			};
			var __embind_register_emval = (rawType) => registerType(rawType, EmValType);
			var floatReadValueFromPointer = (name, width) => {
				switch (width) {
					case 4: return function(pointer) {
						return this.fromWireType(HEAPF32[pointer >> 2]);
					};
					case 8: return function(pointer) {
						return this.fromWireType(HEAPF64[pointer >> 3]);
					};
					default: throw new TypeError(`invalid float width (${width}): ${name}`);
				}
			};
			var __embind_register_float = (rawType, name, size) => {
				name = AsciiToString(name);
				registerType(rawType, {
					name,
					fromWireType: (value) => value,
					toWireType: (destructors, value) => value,
					readValueFromPointer: floatReadValueFromPointer(name, size),
					destructorFunction: null
				});
			};
			var __embind_register_function = (name, argCount, rawArgTypesAddr, signature, rawInvoker, fn, isAsync, isNonnullReturn) => {
				var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
				name = AsciiToString(name);
				name = getFunctionName(name);
				rawInvoker = embind__requireFunction(signature, rawInvoker, isAsync);
				exposePublicSymbol(name, function() {
					throwUnboundTypeError(`Cannot call ${name} due to unbound types`, argTypes);
				}, argCount - 1);
				whenDependentTypesAreResolved([], argTypes, (argTypes$1) => {
					var invokerArgsArray = [argTypes$1[0], null].concat(argTypes$1.slice(1));
					replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, rawInvoker, fn, isAsync), argCount - 1);
					return [];
				});
			};
			var __embind_register_integer = (primitiveType, name, size, minRange, maxRange) => {
				name = AsciiToString(name);
				const isUnsignedType = minRange === 0;
				let fromWireType = (value) => value;
				if (isUnsignedType) {
					var bitshift = 32 - 8 * size;
					fromWireType = (value) => value << bitshift >>> bitshift;
					maxRange = fromWireType(maxRange);
				}
				registerType(primitiveType, {
					name,
					fromWireType,
					toWireType: (destructors, value) => value,
					readValueFromPointer: integerReadValueFromPointer(name, size, minRange !== 0),
					destructorFunction: null
				});
			};
			var __embind_register_memory_view = (rawType, dataTypeIndex, name) => {
				var TA = [
					Int8Array,
					Uint8Array,
					Int16Array,
					Uint16Array,
					Int32Array,
					Uint32Array,
					Float32Array,
					Float64Array,
					BigInt64Array,
					BigUint64Array
				][dataTypeIndex];
				function decodeMemoryView(handle) {
					var size = HEAPU32[handle >> 2];
					var data = HEAPU32[handle + 4 >> 2];
					return new TA(HEAP8.buffer, data, size);
				}
				name = AsciiToString(name);
				registerType(rawType, {
					name,
					fromWireType: decodeMemoryView,
					readValueFromPointer: decodeMemoryView
				}, { ignoreDuplicateRegistrations: true });
			};
			var EmValOptionalType = Object.assign({ optional: true }, EmValType);
			var __embind_register_optional = (rawOptionalType, rawType) => {
				registerType(rawOptionalType, EmValOptionalType);
			};
			var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
				if (!(maxBytesToWrite > 0)) return 0;
				var startIdx = outIdx;
				var endIdx = outIdx + maxBytesToWrite - 1;
				for (var i = 0; i < str.length; ++i) {
					var u = str.codePointAt(i);
					if (u <= 127) {
						if (outIdx >= endIdx) break;
						heap[outIdx++] = u;
					} else if (u <= 2047) {
						if (outIdx + 1 >= endIdx) break;
						heap[outIdx++] = 192 | u >> 6;
						heap[outIdx++] = 128 | u & 63;
					} else if (u <= 65535) {
						if (outIdx + 2 >= endIdx) break;
						heap[outIdx++] = 224 | u >> 12;
						heap[outIdx++] = 128 | u >> 6 & 63;
						heap[outIdx++] = 128 | u & 63;
					} else {
						if (outIdx + 3 >= endIdx) break;
						heap[outIdx++] = 240 | u >> 18;
						heap[outIdx++] = 128 | u >> 12 & 63;
						heap[outIdx++] = 128 | u >> 6 & 63;
						heap[outIdx++] = 128 | u & 63;
						i++;
					}
				}
				heap[outIdx] = 0;
				return outIdx - startIdx;
			};
			var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
			var lengthBytesUTF8 = (str) => {
				var len = 0;
				for (var i = 0; i < str.length; ++i) {
					var c = str.charCodeAt(i);
					if (c <= 127) len++;
					else if (c <= 2047) len += 2;
					else if (c >= 55296 && c <= 57343) {
						len += 4;
						++i;
					} else len += 3;
				}
				return len;
			};
			var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
			var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
				var maxIdx = idx + maxBytesToRead;
				if (ignoreNul) return maxIdx;
				while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
				return idx;
			};
			var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
				var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
				if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
				var str = "";
				while (idx < endPtr) {
					var u0 = heapOrArray[idx++];
					if (!(u0 & 128)) {
						str += String.fromCharCode(u0);
						continue;
					}
					var u1 = heapOrArray[idx++] & 63;
					if ((u0 & 224) == 192) {
						str += String.fromCharCode((u0 & 31) << 6 | u1);
						continue;
					}
					var u2 = heapOrArray[idx++] & 63;
					if ((u0 & 240) == 224) u0 = (u0 & 15) << 12 | u1 << 6 | u2;
					else u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
					if (u0 < 65536) str += String.fromCharCode(u0);
					else {
						var ch = u0 - 65536;
						str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
					}
				}
				return str;
			};
			var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "";
			var __embind_register_std_string = (rawType, name) => {
				name = AsciiToString(name);
				var stdStringIsUTF8 = true;
				registerType(rawType, {
					name,
					fromWireType(value) {
						var length = HEAPU32[value >> 2];
						var payload = value + 4;
						var str;
						if (stdStringIsUTF8) str = UTF8ToString(payload, length, true);
						else {
							str = "";
							for (var i = 0; i < length; ++i) str += String.fromCharCode(HEAPU8[payload + i]);
						}
						_free(value);
						return str;
					},
					toWireType(destructors, value) {
						if (value instanceof ArrayBuffer) value = new Uint8Array(value);
						var length;
						var valueIsOfTypeString = typeof value == "string";
						if (!(valueIsOfTypeString || ArrayBuffer.isView(value) && value.BYTES_PER_ELEMENT == 1)) throwBindingError("Cannot pass non-string to std::string");
						if (stdStringIsUTF8 && valueIsOfTypeString) length = lengthBytesUTF8(value);
						else length = value.length;
						var base = _malloc(4 + length + 1);
						var ptr = base + 4;
						HEAPU32[base >> 2] = length;
						if (valueIsOfTypeString) if (stdStringIsUTF8) stringToUTF8(value, ptr, length + 1);
						else for (var i = 0; i < length; ++i) {
							var charCode = value.charCodeAt(i);
							if (charCode > 255) {
								_free(base);
								throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
							}
							HEAPU8[ptr + i] = charCode;
						}
						else HEAPU8.set(value, ptr);
						if (destructors !== null) destructors.push(_free, base);
						return base;
					},
					readValueFromPointer: readPointer,
					destructorFunction(ptr) {
						_free(ptr);
					}
				});
			};
			var UTF16Decoder = globalThis.TextDecoder ? new TextDecoder("utf-16le") : void 0;
			var UTF16ToString = (ptr, maxBytesToRead, ignoreNul) => {
				var idx = ptr >> 1;
				var endIdx = findStringEnd(HEAPU16, idx, maxBytesToRead / 2, ignoreNul);
				if (endIdx - idx > 16 && UTF16Decoder) return UTF16Decoder.decode(HEAPU16.subarray(idx, endIdx));
				var str = "";
				for (var i = idx; i < endIdx; ++i) {
					var codeUnit = HEAPU16[i];
					str += String.fromCharCode(codeUnit);
				}
				return str;
			};
			var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
				maxBytesToWrite ??= 2147483647;
				if (maxBytesToWrite < 2) return 0;
				maxBytesToWrite -= 2;
				var startPtr = outPtr;
				var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
				for (var i = 0; i < numCharsToWrite; ++i) {
					var codeUnit = str.charCodeAt(i);
					HEAP16[outPtr >> 1] = codeUnit;
					outPtr += 2;
				}
				HEAP16[outPtr >> 1] = 0;
				return outPtr - startPtr;
			};
			var lengthBytesUTF16 = (str) => str.length * 2;
			var UTF32ToString = (ptr, maxBytesToRead, ignoreNul) => {
				var str = "";
				var startIdx = ptr >> 2;
				for (var i = 0; !(i >= maxBytesToRead / 4); i++) {
					var utf32 = HEAPU32[startIdx + i];
					if (!utf32 && !ignoreNul) break;
					str += String.fromCodePoint(utf32);
				}
				return str;
			};
			var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
				maxBytesToWrite ??= 2147483647;
				if (maxBytesToWrite < 4) return 0;
				var startPtr = outPtr;
				var endPtr = startPtr + maxBytesToWrite - 4;
				for (var i = 0; i < str.length; ++i) {
					var codePoint = str.codePointAt(i);
					if (codePoint > 65535) i++;
					HEAP32[outPtr >> 2] = codePoint;
					outPtr += 4;
					if (outPtr + 4 > endPtr) break;
				}
				HEAP32[outPtr >> 2] = 0;
				return outPtr - startPtr;
			};
			var lengthBytesUTF32 = (str) => {
				var len = 0;
				for (var i = 0; i < str.length; ++i) {
					if (str.codePointAt(i) > 65535) i++;
					len += 4;
				}
				return len;
			};
			var __embind_register_std_wstring = (rawType, charSize, name) => {
				name = AsciiToString(name);
				var decodeString, encodeString, lengthBytesUTF;
				if (charSize === 2) {
					decodeString = UTF16ToString;
					encodeString = stringToUTF16;
					lengthBytesUTF = lengthBytesUTF16;
				} else {
					decodeString = UTF32ToString;
					encodeString = stringToUTF32;
					lengthBytesUTF = lengthBytesUTF32;
				}
				registerType(rawType, {
					name,
					fromWireType: (value) => {
						var length = HEAPU32[value >> 2];
						var str = decodeString(value + 4, length * charSize, true);
						_free(value);
						return str;
					},
					toWireType: (destructors, value) => {
						if (!(typeof value == "string")) throwBindingError(`Cannot pass non-string to C++ string type ${name}`);
						var length = lengthBytesUTF(value);
						var ptr = _malloc(4 + length + charSize);
						HEAPU32[ptr >> 2] = length / charSize;
						encodeString(value, ptr + 4, length + charSize);
						if (destructors !== null) destructors.push(_free, ptr);
						return ptr;
					},
					readValueFromPointer: readPointer,
					destructorFunction(ptr) {
						_free(ptr);
					}
				});
			};
			var __embind_register_void = (rawType, name) => {
				name = AsciiToString(name);
				registerType(rawType, {
					isVoid: true,
					name,
					fromWireType: () => void 0,
					toWireType: (destructors, o) => void 0
				});
			};
			var emval_methodCallers = [];
			var emval_addMethodCaller = (caller) => {
				var id = emval_methodCallers.length;
				emval_methodCallers.push(caller);
				return id;
			};
			var requireRegisteredType = (rawType, humanName) => {
				var impl = registeredTypes[rawType];
				if (void 0 === impl) throwBindingError(`${humanName} has unknown type ${getTypeName(rawType)}`);
				return impl;
			};
			var emval_lookupTypes = (argCount, argTypes) => {
				var a = new Array(argCount);
				for (var i = 0; i < argCount; ++i) a[i] = requireRegisteredType(HEAPU32[argTypes + i * 4 >> 2], `parameter ${i}`);
				return a;
			};
			var emval_returnValue = (toReturnWire, destructorsRef, handle) => {
				var destructors = [];
				var result = toReturnWire(destructors, handle);
				if (destructors.length) HEAPU32[destructorsRef >> 2] = Emval.toHandle(destructors);
				return result;
			};
			var emval_symbols = {};
			var getStringOrSymbol = (address) => {
				var symbol = emval_symbols[address];
				if (symbol === void 0) return AsciiToString(address);
				return symbol;
			};
			var __emval_create_invoker = (argCount, argTypesPtr, kind) => {
				var GenericWireTypeSize = 8;
				var [retType, ...argTypes] = emval_lookupTypes(argCount, argTypesPtr);
				var toReturnWire = retType.toWireType.bind(retType);
				var argFromPtr = argTypes.map((type) => type.readValueFromPointer.bind(type));
				argCount--;
				var captures = { toValue: Emval.toValue };
				var args = argFromPtr.map((argFromPtr$1, i) => {
					var captureName = `argFromPtr${i}`;
					captures[captureName] = argFromPtr$1;
					return `${captureName}(args${i ? "+" + i * GenericWireTypeSize : ""})`;
				});
				var functionBody;
				switch (kind) {
					case 0:
						functionBody = "toValue(handle)";
						break;
					case 2:
						functionBody = "new (toValue(handle))";
						break;
					case 3:
						functionBody = "";
						break;
					case 1:
						captures["getStringOrSymbol"] = getStringOrSymbol;
						functionBody = "toValue(handle)[getStringOrSymbol(methodName)]";
						break;
				}
				functionBody += `(${args})`;
				if (!retType.isVoid) {
					captures["toReturnWire"] = toReturnWire;
					captures["emval_returnValue"] = emval_returnValue;
					functionBody = `return emval_returnValue(toReturnWire, destructorsRef, ${functionBody})`;
				}
				functionBody = `return function (handle, methodName, destructorsRef, args) {\n  ${functionBody}\n  }`;
				var invokerFunction = new Function(Object.keys(captures), functionBody)(...Object.values(captures));
				return emval_addMethodCaller(createNamedFunction(`methodCaller<(${argTypes.map((t) => t.name)}) => ${retType.name}>`, invokerFunction));
			};
			var __emval_invoke = (caller, handle, methodName, destructorsRef, args) => emval_methodCallers[caller](handle, methodName, destructorsRef, args);
			var __emval_run_destructors = (handle) => {
				runDestructors(Emval.toValue(handle));
				__emval_decref(handle);
			};
			var getHeapMax = () => 2147483648;
			var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
			var growMemory = (size) => {
				var pages = (size - wasmMemory.buffer.byteLength + 65535) / 65536 | 0;
				try {
					wasmMemory.grow(pages);
					updateMemoryViews();
					return 1;
				} catch (e) {}
			};
			var _emscripten_resize_heap = (requestedSize) => {
				var oldSize = HEAPU8.length;
				requestedSize >>>= 0;
				var maxHeapSize = getHeapMax();
				if (requestedSize > maxHeapSize) return false;
				for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
					var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
					overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
					if (growMemory(Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536)))) return true;
				}
				return false;
			};
			init_ClassHandle();
			init_RegisteredPointer();
			if (Module["noExitRuntime"]) Module["noExitRuntime"];
			if (Module["print"]) Module["print"];
			if (Module["printErr"]) err = Module["printErr"];
			if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
			if (Module["arguments"]) Module["arguments"];
			if (Module["thisProgram"]) Module["thisProgram"];
			if (Module["preInit"]) {
				if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
				while (Module["preInit"].length > 0) Module["preInit"].shift()();
			}
			var ___getTypeName, _malloc, _free, wasmMemory, wasmTable;
			function assignWasmExports(wasmExports$1) {
				___getTypeName = wasmExports$1["w"];
				_malloc = wasmExports$1["y"];
				_free = wasmExports$1["z"];
				wasmMemory = wasmExports$1["u"];
				wasmTable = wasmExports$1["x"];
			}
			var wasmImports = {
				f: ___cxa_throw,
				p: __abort_js,
				h: __embind_register_bigint,
				t: __embind_register_bool,
				n: __embind_register_class,
				m: __embind_register_class_constructor,
				c: __embind_register_class_function,
				r: __embind_register_emval,
				g: __embind_register_float,
				d: __embind_register_function,
				b: __embind_register_integer,
				a: __embind_register_memory_view,
				o: __embind_register_optional,
				s: __embind_register_std_string,
				e: __embind_register_std_wstring,
				i: __embind_register_void,
				l: __emval_create_invoker,
				k: __emval_invoke,
				j: __emval_run_destructors,
				q: _emscripten_resize_heap
			};
			function run() {
				preRun();
				function doRun() {
					Module["calledRun"] = true;
					if (ABORT) return;
					initRuntime();
					readyPromiseResolve?.(Module);
					Module["onRuntimeInitialized"]?.();
					postRun();
				}
				if (Module["setStatus"]) {
					Module["setStatus"]("Running...");
					setTimeout(() => {
						setTimeout(() => Module["setStatus"](""), 1);
						doRun();
					}, 1);
				} else doRun();
			}
			var wasmExports = await createWasm();
			run();
			if (runtimeInitialized) moduleRtn = Module;
			else moduleRtn = new Promise((resolve, reject) => {
				readyPromiseResolve = resolve;
				readyPromiseReject = reject;
			});
			return moduleRtn;
		};
	})();
	if (typeof exports === "object" && typeof module === "object") {
		module.exports = createRcmbWasm$1;
		module.exports.default = createRcmbWasm$1;
	} else if (typeof define === "function" && define["amd"]) define([], () => createRcmbWasm$1);
}) });

//#endregion
//#region ../../lib/ts/src/RcmbJS.ts
var import_rcmb_wasm = /* @__PURE__ */ __toESM(require_rcmb_wasm());
let Method = /* @__PURE__ */ function(Method$1) {
	Method$1[Method$1["FindCombination"] = 1] = "FindCombination";
	Method$1[Method$1["FindDivider"] = 2] = "FindDivider";
	return Method$1;
}({});
let Filter = /* @__PURE__ */ function(Filter$1) {
	Filter$1[Filter$1["Exact"] = 0] = "Exact";
	Filter$1[Filter$1["Below"] = 1] = "Below";
	Filter$1[Filter$1["Above"] = 2] = "Above";
	Filter$1[Filter$1["Nearest"] = 3] = "Nearest";
	return Filter$1;
}({});
let TopologyConstraint = /* @__PURE__ */ function(TopologyConstraint$1) {
	TopologyConstraint$1[TopologyConstraint$1["Series"] = 1] = "Series";
	TopologyConstraint$1[TopologyConstraint$1["Parallel"] = 2] = "Parallel";
	TopologyConstraint$1[TopologyConstraint$1["NoLimit"] = 3] = "NoLimit";
	return TopologyConstraint$1;
}({});
const MAX_COMBINATION_ELEMENTS = 10;
var Topology = class {
	num_leafs = -1;
	depth = -1;
	hash = -1;
	constructor(iLeft, iRight, parallel, children) {
		this.iLeft = iLeft;
		this.iRight = iRight;
		this.parallel = parallel;
		this.children = children;
		if (children.length === 0) {
			this.hash = 1;
			this.depth = 0;
			this.num_leafs = 1;
		} else {
			const POLY = 2149580803;
			let lfsr = parallel ? 2863311530 : 1431655765;
			this.num_leafs = 0;
			for (const child of children) {
				lfsr ^= child.hash;
				const msb = (lfsr & 2147483648) !== 0;
				lfsr = (lfsr & 2147483647) << 1;
				if (msb) lfsr ^= POLY;
				this.num_leafs += child.num_leafs;
				this.depth = Math.max(this.depth, child.depth + 1);
			}
			this.hash = lfsr;
		}
	}
	get isLeaf() {
		return this.iLeft + 1 >= this.iRight;
	}
};
var Combination = class {
	capacitor = false;
	parallel = false;
	children = [];
	value = 0;
	numLeafs = -1;
	constructor() {}
	get isLeaf() {
		return this.children.length === 0;
	}
	get unit() {
		return this.capacitor ? "F" : "Ω";
	}
	toString(indent = "") {
		if (this.isLeaf) return `${indent}${formatValue(this.value, this.unit)}\n`;
		else {
			let ret = "";
			for (const child of this.children) ret += child.toString(indent + "    ");
			ret = `${indent}${this.parallel ? "Parallel" : "Series"} (${formatValue(this.value, this.unit)}):\n${ret}`;
			return ret;
		}
	}
	toJson() {
		if (this.isLeaf) return this.value;
		else return {
			parallel: this.parallel,
			value: this.value,
			children: this.children.map((child) => child.toJson())
		};
	}
};
var DoubleCombination = class {
	constructor(uppers, lowers, ratio) {
		this.uppers = uppers;
		this.lowers = lowers;
		this.ratio = ratio;
	}
	toString() {
		const up = this.uppers[0];
		const lo = this.lowers[0];
		let ret = `R2 / (R1 + R2) = ${this.ratio.toFixed(6)}\nR1 + R2 = ${formatValue(up.value + lo.value, "Ω")}\n`;
		ret += "R1:\n";
		ret += up.toString("    ");
		ret += "R2:\n";
		ret += lo.toString("    ");
		return ret;
	}
	toJson() {
		return {
			ratio: this.ratio,
			uppers: this.uppers.map((upper) => upper.toJson()),
			lowers: this.lowers.map((lower) => lower.toJson())
		};
	}
};
const topologies = /* @__PURE__ */ new Map();
function findCombinations(capacitor, values, targetValue, maxElements, topoConstr, maxDepth, filter) {
	try {
		return {
			error: "",
			result: searchCombinations(capacitor, values, targetValue, maxElements, topoConstr, maxDepth, filter).map((comb) => comb.toJson())
		};
	} catch (e) {
		return {
			error: e.message,
			result: []
		};
	}
}
function findDividers(values, targetRatio, totalMin, totalMax, maxElements, topoConstr, maxDepth, filter) {
	try {
		return {
			error: "",
			result: searchDividers(values, targetRatio, totalMin, totalMax, maxElements, topoConstr, maxDepth, filter).map((comb) => comb.toJson())
		};
	} catch (e) {
		return {
			error: e.message,
			result: []
		};
	}
}
function searchCombinations(capacitor, values, targetValue, maxElements, topoConstr, maxDepth, filter) {
	const epsilon = targetValue * 1e-9;
	const retMin = targetValue / 2;
	const retMax = targetValue * 2;
	if (maxElements > MAX_COMBINATION_ELEMENTS) throw new Error("The search space is too large.");
	let bestError = Number.POSITIVE_INFINITY;
	let bestElems = Number.POSITIVE_INFINITY;
	let bestCombinations = [];
	for (let numElem = 1; numElem <= maxElements; numElem++) {
		const topos = searchTopologies(0, numElem);
		const indices = new Array(numElem).fill(0);
		while (indices[numElem - 1] < values.length) {
			for (const topo of topos) {
				const t = topo.parallel ? TopologyConstraint.Parallel : TopologyConstraint.Series;
				if (numElem >= 2 && !(t & topoConstr)) continue;
				if (topo.depth > maxDepth) continue;
				const value = calcValue(capacitor, values, indices, topo, null, retMin, retMax);
				if (isNaN(value)) continue;
				if ((filter & Filter.Below) === 0 && value < targetValue - epsilon) continue;
				else if ((filter & Filter.Above) === 0 && value > targetValue + epsilon) continue;
				const error = Math.abs(value - targetValue);
				if (error - epsilon > bestError) continue;
				if (error + epsilon >= bestError && numElem > bestElems) continue;
				if (error + epsilon < bestError || numElem < bestElems) bestCombinations = [];
				bestError = error;
				bestElems = numElem;
				const comb = new Combination();
				calcValue(capacitor, values, indices, topo, comb);
				bestCombinations.push(comb);
			}
			incrementIndices(indices, values);
		}
		if (bestError <= epsilon) break;
	}
	return filterUnnormalizedCombinations(bestCombinations);
}
function searchDividers(values, targetRatio, totalMin, totalMax, maxElements, topoConstr, maxDepth, filter) {
	const epsilon = 1e-9;
	if (maxElements > MAX_COMBINATION_ELEMENTS) throw new Error("The search space is too large.");
	let bestError = Number.POSITIVE_INFINITY;
	let bestElems = Number.POSITIVE_INFINITY;
	let bestCombs = [];
	const combMemo = /* @__PURE__ */ new Map();
	for (let lowerElems = 1; lowerElems <= maxElements - 1; lowerElems++) {
		const topos = searchTopologies(0, lowerElems);
		const indices = new Array(lowerElems).fill(0);
		while (indices[lowerElems - 1] < values.length) {
			for (const topo of topos) {
				let upperMaxElements = maxElements - lowerElems;
				if (bestError < epsilon) {
					upperMaxElements = bestElems - lowerElems;
					if (upperMaxElements <= 0) break;
				}
				const t = topo.parallel ? TopologyConstraint.Parallel : TopologyConstraint.Series;
				if (lowerElems >= 2 && !(t & topoConstr)) continue;
				if (topo.depth > maxDepth) continue;
				const lowerValue = calcValue(false, values, indices, topo, null, 0, totalMax);
				if (isNaN(lowerValue)) continue;
				const totalTargetValue = lowerValue / targetRatio;
				const upperTargetValue = totalTargetValue - lowerValue;
				if (totalTargetValue < totalMin || totalMax < totalTargetValue) continue;
				const lowerKey = valueKey(lowerValue);
				if (combMemo.has(lowerKey)) {
					const memo = combMemo.get(lowerKey);
					const memoLowers = memo.lowers[0].numLeafs;
					const memoElems = memoLowers + memo.uppers[0].numLeafs;
					if (lowerElems <= memoLowers && memoElems <= bestElems) {
						const lowerComb$1 = new Combination();
						calcValue(false, values, indices, topo, lowerComb$1);
						memo.lowers.push(lowerComb$1);
					}
					continue;
				}
				const upperCombs = searchCombinations(false, values, upperTargetValue, upperMaxElements, topoConstr, maxDepth, filter);
				if (upperCombs.length === 0) continue;
				const ratio = lowerValue / (upperCombs[0].value + lowerValue);
				if ((filter & Filter.Below) === 0 && ratio < targetRatio - epsilon) continue;
				else if ((filter & Filter.Above) === 0 && ratio > targetRatio + epsilon) continue;
				const numElems = lowerElems + upperCombs[0].numLeafs;
				const error = Math.abs(ratio - targetRatio);
				if (error - epsilon > bestError) continue;
				if (error + epsilon >= bestError && numElems > bestElems) continue;
				if (error + epsilon < bestError || numElems < bestElems) bestCombs.length = 0;
				bestError = error;
				bestElems = numElems;
				const lowerComb = new Combination();
				calcValue(false, values, indices, topo, lowerComb);
				const dividerComb = new DoubleCombination(upperCombs, [lowerComb], ratio);
				bestCombs.push(dividerComb);
				combMemo.set(lowerKey, dividerComb);
			}
			incrementIndices(indices, values);
		}
	}
	for (const comb of bestCombs) {
		comb.uppers = filterUnnormalizedCombinations(comb.uppers);
		comb.lowers = filterUnnormalizedCombinations(comb.lowers);
	}
	return bestCombs;
}
function incrementIndices(indices, values) {
	const n = indices.length;
	for (let i = 0; i < n; i++) {
		indices[i]++;
		if (indices[i] < values.length) break;
		else if (i + 1 >= n) break;
		else indices[i] = 0;
	}
}
function filterUnnormalizedCombinations(combs) {
	let bestComplexity = Number.POSITIVE_INFINITY;
	for (const comb of combs) if (comb.numLeafs < bestComplexity) bestComplexity = comb.numLeafs;
	return combs.filter((comb) => comb.numLeafs === bestComplexity);
}
function calcValue(capacitor, values, indices, topo, comb = null, min = 0, max = Number.POSITIVE_INFINITY) {
	if (comb) {
		comb.capacitor = capacitor;
		comb.parallel = topo.parallel;
		comb.numLeafs = topo.num_leafs;
	}
	if (topo.isLeaf) {
		const val$1 = values[indices[topo.iLeft]];
		if (val$1 < min || max < val$1) return NaN;
		if (comb) comb.value = val$1;
		return val$1;
	}
	let invSum = false;
	if (capacitor) invSum = !topo.parallel;
	else invSum = topo.parallel;
	let accum = 0;
	let lastVal = Number.POSITIVE_INFINITY;
	let lastTopo = -1;
	for (let iChild = 0; iChild < topo.children.length; iChild++) {
		const childTopo = topo.children[iChild];
		const childComb = comb ? new Combination() : null;
		const last = iChild + 1 >= topo.children.length;
		let childMin = 0;
		let childMax = Number.POSITIVE_INFINITY;
		if (invSum) if (last) {
			const tmp = 1 / accum;
			childMin = tmp * min / (tmp - min);
			childMax = tmp * max / (tmp - max);
			if (childMax < childMin) childMax = Number.POSITIVE_INFINITY;
		} else childMin = min;
		else {
			if (last) childMin = min - accum;
			childMax = max - accum;
		}
		const childVal = calcValue(capacitor, values, indices, childTopo, childComb, childMin, childMax);
		if (isNaN(childVal)) return NaN;
		if (lastTopo === childTopo.hash) {
			if (childVal > lastVal) return NaN;
		}
		lastTopo = childTopo.hash;
		lastVal = childVal;
		if (comb) comb.children.push(childComb);
		if (invSum) accum += 1 / childVal;
		else accum += childVal;
	}
	const val = invSum ? 1 / accum : accum;
	if (comb) comb.value = val;
	return val;
}
function searchTopologies(iLeft, iRight) {
	let topos = searchTopologiesRecursive(iLeft, iRight, false);
	if (iLeft + 1 < iRight) topos = topos.concat(searchTopologiesRecursive(iLeft, iRight, true));
	return topos;
}
function searchTopologiesRecursive(iLeft, iRight, parallel) {
	const key = iLeft + iRight * 1e3 + (parallel ? 1e6 : 0);
	if (topologies.has(key)) return topologies.get(key);
	const ret = new Array();
	if (iLeft + 1 >= iRight) {
		ret.push(new Topology(iLeft, iRight, parallel, []));
		topologies.set(key, ret);
		return ret;
	}
	const n = iRight - iLeft;
	divideElementsRecursive(new Array(n), 0, n, (partSizes, numParts) => {
		const parts = new Array(numParts);
		let il = iLeft;
		for (let iPart = 0; iPart < numParts; iPart++) {
			const ir = il + partSizes[iPart];
			parts[iPart] = searchTopologiesRecursive(il, ir, !parallel);
			il = ir;
		}
		const indices = new Array(numParts).fill(0);
		while (indices[numParts - 1] < parts[numParts - 1].length) {
			const childNodes = new Array(numParts);
			for (let iPart = 0; iPart < numParts; iPart++) childNodes[iPart] = parts[iPart][indices[iPart]];
			ret.push(new Topology(iLeft, iRight, parallel, childNodes));
			for (let i = 0; i < numParts; i++) {
				indices[i]++;
				if (indices[i] < parts[i].length) break;
				else if (i + 1 >= numParts) break;
				else indices[i] = 0;
			}
		}
	}, 0);
	topologies.set(key, ret);
	return ret;
}
function divideElementsRecursive(buff, buffSize, numElems, callback, depth) {
	if (numElems === 0) callback(buff, buffSize);
	else {
		let wMax = numElems;
		if (buffSize == 0) wMax = numElems - 1;
		else if (buffSize > 0 && buff[buffSize - 1] < wMax) wMax = buff[buffSize - 1];
		for (let w = 1; w <= wMax; w++) {
			buff[buffSize] = w;
			divideElementsRecursive(buff, buffSize + 1, numElems - w, callback, depth + 1);
		}
	}
}
function formatValue(value, unit = "", usePrefix = null) {
	if (!isFinite(value) || isNaN(value)) return "NaN";
	if (usePrefix === null) usePrefix = unit !== "";
	let prefix = "";
	if (usePrefix) {
		if (value >= 999999e6) {
			value /= 0xe8d4a51000;
			prefix = "T";
		} else if (value >= 999999e3) {
			value /= 1e9;
			prefix = "G";
		} else if (value >= 999999) {
			value /= 1e6;
			prefix = "M";
		} else if (value >= 999.999) {
			value /= 1e3;
			prefix = "k";
		} else if (value >= .999999) prefix = "";
		else if (value >= 999999e-9) {
			value *= 1e3;
			prefix = "m";
		} else if (value >= 9.99999e-7) {
			value *= 1e6;
			prefix = "μ";
		} else if (value >= 999999e-15) {
			value *= 1e9;
			prefix = "n";
		} else if (value >= 999999e-18) {
			value *= 0xe8d4a51000;
			prefix = "p";
		}
	}
	const minDigits = usePrefix ? 3 : 6;
	value = Math.round(value * pow10(minDigits));
	let s = "";
	while (s.length <= minDigits + 1 || value > 0) {
		const digit = value % 10;
		value = Math.floor(value / 10);
		s = digit.toString() + s;
		if (s.length === minDigits) s = "." + s;
	}
	s = s.replace(/\.?0+$/, "");
	return `${s} ${prefix}${unit}`.trim();
}
function valueKey(value) {
	const clog10 = Math.floor(Math.log10(Math.abs(value)) + 1e-9);
	return Math.round(value / pow10(clog10 - 6));
}
function pow10(exp) {
	let ret = 1;
	const neg = exp < 0;
	if (neg) exp = -exp;
	if (exp >= 16) {
		ret *= 0x2386f26fc10000;
		exp -= 16;
	}
	if (exp >= 8) {
		ret *= 1e8;
		exp -= 8;
	}
	if (exp >= 4) {
		ret *= 1e4;
		exp -= 4;
	}
	if (exp >= 2) {
		ret *= 100;
		exp -= 2;
	}
	if (exp >= 1) {
		ret *= 10;
		exp -= 1;
	}
	ret *= Math.pow(10, exp);
	if (neg) ret = 1 / ret;
	return ret;
}

//#endregion
//#region src/WorkerCore.ts
var WorkerCore_exports = {};
let wasmCore = null;
const thisWorker = self;
thisWorker.onmessage = async (e) => {
	const args = e.data;
	const useWasm = args.useWasm;
	if (useWasm) {
		if (!wasmCore) {
			console.log("Loading WASM module...");
			wasmCore = await (0, import_rcmb_wasm.default)();
			console.log("WASM module loaded.");
		}
	}
	const capacitor = args.capacitor;
	const method = args.method;
	const values = args.values;
	const maxElements = args.maxElements;
	const topologyConstraint = args.topologyConstraint;
	const maxDepth = args.maxDepth;
	const filter = args.filter;
	let ret = {
		error: "",
		result: [],
		timeSpent: 0
	};
	const start = performance.now();
	switch (method) {
		case Method.FindCombination:
			{
				const targetValue = args.targetValue;
				if (useWasm) {
					const vec = new wasmCore.VectorDouble();
					for (const v of values) vec.push_back(v);
					const retStr = wasmCore.findCombinations(capacitor, vec, targetValue, maxElements, topologyConstraint, maxDepth, filter);
					vec.delete();
					ret = JSON.parse(retStr);
				} else ret = findCombinations(capacitor, values, targetValue, maxElements, topologyConstraint, maxDepth, filter);
			}
			break;
		case Method.FindDivider:
			{
				const targetRatio = args.targetRatio;
				const totalMin = args.totalMin;
				const totalMax = args.totalMax;
				if (useWasm) {
					const vec = new wasmCore.VectorDouble();
					for (const v of values) vec.push_back(v);
					const retStr = wasmCore.findDividers(vec, targetRatio, totalMin, totalMax, maxElements, topologyConstraint, maxDepth, filter);
					vec.delete();
					ret = JSON.parse(retStr);
				} else ret = findDividers(values, targetRatio, totalMin, totalMax, maxElements, topologyConstraint, maxDepth, filter);
			}
			break;
		default:
			ret.error = "Invalid method";
			break;
	}
	ret.timeSpent = performance.now() - start;
	thisWorker.postMessage(ret);
};

//#endregion
export { WorkerCore_exports as WorkerCore };