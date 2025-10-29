//#region ../../lib/ts/src/RcmbJS.ts
let Method = /* @__PURE__ */ function(Method$1) {
	Method$1[Method$1["FindCombination"] = 1] = "FindCombination";
	Method$1[Method$1["FindDivider"] = 2] = "FindDivider";
	return Method$1;
}({});
let TopologyConstraint = /* @__PURE__ */ function(TopologyConstraint$1) {
	TopologyConstraint$1[TopologyConstraint$1["Series"] = 1] = "Series";
	TopologyConstraint$1[TopologyConstraint$1["Parallel"] = 2] = "Parallel";
	TopologyConstraint$1[TopologyConstraint$1["NoLimit"] = 3] = "NoLimit";
	return TopologyConstraint$1;
}({});
const MAX_COMBINATION_ELEMENTS = 10;

//#endregion
//#region src/Calc.ts
function evalExpr(expStr) {
	const sr = new StringReader(expStr);
	const ret = expr(sr);
	sr.skipWhitespace();
	if (!sr.eof()) throw new Error("Unexpected characters at the end of expression");
	return ret;
}
function expr(sr) {
	return addSub(sr);
}
function addSub(sr) {
	sr.skipWhitespace();
	let left = mulDiv(sr);
	sr.skipWhitespace();
	while (sr.readIfMatch("+") || sr.readIfMatch("-")) {
		const op = sr.readIfSymbol();
		sr.skipWhitespace();
		const right = mulDiv(sr);
		sr.skipWhitespace();
		left = op === "+" ? left + right : left - right;
	}
	return left;
}
function mulDiv(sr) {
	sr.skipWhitespace();
	let left = operand(sr);
	sr.skipWhitespace();
	while (sr.readIfMatch("*") || sr.readIfMatch("/")) {
		const op = sr.readIfSymbol();
		sr.skipWhitespace();
		const right = operand(sr);
		sr.skipWhitespace();
		left = op === "*" ? left * right : left / right;
	}
	return left;
}
function operand(sr) {
	sr.skipWhitespace();
	if (sr.readIfMatch("(")) {
		const val = expr(sr);
		sr.skipWhitespace();
		sr.expect(")");
		return val;
	}
	const num = sr.readNumber();
	sr.skipWhitespace();
	let prefix = sr.readIfPrefix();
	switch (prefix) {
		case "p": return num * 1e-12;
		case "n": return num * 1e-9;
		case "u":
		case "μ": return num * 1e-6;
		case "m": return num * .001;
		case "k":
		case "K": return num * 1e3;
		case "M": return num * 1e6;
		case "G": return num * 1e9;
		case "T": return num * 0xe8d4a51000;
		default:
			if (prefix) sr.back(1);
			return num;
	}
}
var StringReader = class StringReader {
	static RE_CHARS_TO_BE_QUOTED = /[\{\}\[\]:,\\]/;
	static KEYWORDS = [
		"true",
		"false",
		"null"
	];
	pos = 0;
	constructor(str) {
		this.str = str;
	}
	peek(length = 1) {
		if (this.pos + length > this.str.length) return null;
		return this.str.substring(this.pos, this.pos + length);
	}
	read(length = 1) {
		const s = this.peek(length);
		if (s === null) throw new Error("Unexpected end of string");
		this.pos += length;
		return s;
	}
	back(length = 1) {
		this.pos -= length;
		if (this.pos < 0) throw new Error("Position out of range");
	}
	readIfMatch(s) {
		const len = s.length;
		if (this.peek(len) === s) {
			this.pos += len;
			return true;
		}
		return false;
	}
	readDecimalString() {
		let numStr = "";
		while (true) {
			const ch = this.peek();
			if (ch !== null && /[0-9]/.test(ch)) numStr += this.read();
			else break;
		}
		if (numStr.length === 0) throw new Error("Decimal number expected");
		return numStr;
	}
	readIfNumber() {
		let numStr = "";
		if (this.readIfMatch("-")) numStr += "-";
		else if (this.readIfMatch("+")) numStr += "+";
		else {
			const first = this.peek();
			if (first === null || !/[0-9]/.test(first)) return null;
		}
		numStr += this.readDecimalString();
		if (this.readIfMatch(".")) {
			numStr += ".";
			numStr += this.readDecimalString();
		}
		if (this.readIfMatch("e") || this.readIfMatch("E")) {
			numStr += "e";
			if (this.readIfMatch("+")) numStr += "+";
			else if (this.readIfMatch("-")) numStr += "-";
			numStr += this.readDecimalString();
		}
		return Number(numStr);
	}
	readNumber() {
		const num = this.readIfNumber();
		if (num === null) throw new Error("Number expected");
		return num;
	}
	readIfSymbol() {
		const ch = this.peek();
		if (ch !== null && /[\(\)\/\*\+\-]/.test(ch)) return this.read();
		return null;
	}
	readIfPrefix() {
		const ch = this.peek();
		if (ch !== null && /[pnuμmkKMGT]/.test(ch)) return this.read();
		return null;
	}
	expect(s) {
		if (this.readIfMatch(s)) return;
		throw new Error(`Keyword "${s}" expected`);
	}
	readIfStringChar(quotation) {
		const ch = this.peek();
		if (ch === null) throw new Error("Unexpected end of string");
		else if (quotation && ch === quotation) return null;
		else if (!quotation && StringReader.RE_CHARS_TO_BE_QUOTED.test(ch)) return null;
		else if (ch === "\\") {
			this.read();
			switch (this.read()) {
				case "\"": return "\"";
				case "\\": return "\\";
				case "/": return "/";
				case "b": return "\b";
				case "f": return "\f";
				case "n": return "\n";
				case "r": return "\r";
				case "t": return "	";
				case "u":
					let hex = "";
					for (let i = 0; i < 4; i++) {
						const h = this.read();
						if (!/[0-9a-fA-F]/.test(h)) throw new Error("Invalid Unicode escape");
						hex += h;
					}
					return String.fromCharCode(parseInt(hex, 16));
				default: throw new Error("Invalid escape character");
			}
		} else return this.read();
	}
	readIfString() {
		const next = this.peek();
		if (next === null) return null;
		if (next === "\"" || next === "'") {
			const quotation = this.read();
			let str = "";
			while (true) {
				const ch = this.readIfStringChar(quotation);
				if (ch === null) break;
				str += ch;
			}
			this.expect(quotation);
			return str;
		}
		if (next && !StringReader.RE_CHARS_TO_BE_QUOTED.test(next) || !/[0-9]/.test(next)) {
			let str = "";
			while (true) {
				const ch = this.readIfStringChar(null);
				if (ch === null) break;
				str += ch;
			}
			if (StringReader.KEYWORDS.includes(str)) {
				this.back(str.length);
				return null;
			}
			return str;
		}
		return null;
	}
	readString() {
		const str = this.readIfString();
		if (str === null) throw new Error("String expected");
		return str;
	}
	readIfBoolean() {
		if (this.readIfMatch("true")) return true;
		if (this.readIfMatch("false")) return false;
		return null;
	}
	skipWhitespace() {
		while (true) {
			const ch = this.peek();
			if (ch !== null && /\s/.test(ch)) this.read();
			else break;
		}
	}
	eof() {
		return this.pos >= this.str.length;
	}
};
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
//#region src/Series.ts
const Series = {
	"E1": [100],
	"E3": [
		100,
		220,
		470
	],
	"E6": [
		100,
		150,
		220,
		330,
		470,
		680
	],
	"E12": [
		100,
		120,
		150,
		180,
		220,
		270,
		330,
		390,
		470,
		560,
		680,
		820
	],
	"E24": [
		100,
		110,
		120,
		130,
		150,
		160,
		180,
		200,
		220,
		240,
		270,
		300,
		330,
		360,
		390,
		430,
		470,
		510,
		560,
		620,
		680,
		750,
		820,
		910
	]
};
function makeAvaiableValues(series, minValue = 1e-12, maxValue = 0xe8d4a51000) {
	const baseValues = Series[series];
	if (!baseValues) throw new Error(`Unknown series: ${series}`);
	const values = [];
	for (let exp = -11; exp <= 15; exp++) {
		const multiplier = pow10(exp - 3);
		for (const base of baseValues) {
			const value = base * multiplier;
			const epsilon = value / 1e6;
			if (minValue - epsilon <= value && value <= maxValue + epsilon) values.push(value);
		}
	}
	values.sort((a, b) => a - b);
	return values;
}

//#endregion
//#region src/Text.ts
const texts = { "ja": {
	"Find Resistor Combinations": "合成抵抗を見つける",
	"Find Capacitor Combinations": "合成容量を見つける",
	"Find Voltage Dividers": "分圧抵抗を見つける",
	"Find LED Current Limiting Resistor": "LEDの電流制限抵抗を見つける",
	"Power Voltage": "電源電圧",
	"Forward Voltage": "順方向電圧",
	"Forward Current": "順方向電流",
	"E Series": "シリーズ",
	"Item": "項目",
	"Value": "値",
	"Unit": "単位",
	"Minimum": "素子最小値",
	"Maximum": "素子最大値",
	"Custom": "カスタム",
	"Custom Values": "カスタム値",
	"Max Elements": "最大素子数",
	"Target Value": "目標値",
	"The search space is too large.": "探索空間が大きすぎます。",
	"Upper Resistor": "上側の抵抗",
	"Lower Resistor": "下側の抵抗",
	"No combinations found.": "組み合わせが見つかりませんでした。",
	"<n> combinations found": "<n> 件の組み合わせが見つかりました",
	"Parallel": "並列",
	"Series": "直列",
	"Ideal Value": "理想値",
	"<s> Approximation": "<s> 近似",
	"Error": "誤差",
	"No Error": "誤差なし",
	"No Limit": "制限なし",
	"Top Topology": "最上位トポロジー",
	"Max Nests": "最大ネスト数",
	"Search Time": "探索時間",
	"Use WebAssembly": "WebAssembly 使用",
	"Show Color Code": "カラーコード表示"
} };
function getStr(key, vars) {
	let ret = key;
	const lang = navigator.language;
	if (lang in texts && key in texts[lang]) ret = texts[lang][key];
	if (vars) for (const varKey of Object.keys(vars)) {
		const varValue = vars[varKey];
		ret = ret.replace(new RegExp(`<${varKey}>`, "g"), varValue.toString());
	}
	return ret;
}

//#endregion
//#region src/RcmbUi.ts
var CommonSettingsUi = class {
	useWasmCheckbox = makeCheckbox(getStr("Use WebAssembly"), true);
	showColorCodeCheckbox = makeCheckbox(getStr("Show Color Code"), true);
	ui = makeDiv$1([
		document.createElement("hr"),
		this.useWasmCheckbox.parentNode,
		" | ",
		this.showColorCodeCheckbox.parentNode
	], null, true);
	onChanged = [];
	constructor() {
		this.useWasmCheckbox.addEventListener("change", () => {
			this.onChanged.forEach((callback) => callback());
		});
		this.showColorCodeCheckbox.addEventListener("change", () => {
			this.onChanged.forEach((callback) => callback());
		});
	}
};
var ValueRangeSelector = class {
	seriesSelect = makeSeriesSelector();
	customValuesInput = document.createElement("textarea");
	minResisterInput = new ValueBox();
	maxResisterInput = new ValueBox();
	constructor(capacitor) {
		this.capacitor = capacitor;
		if (capacitor) {
			this.customValuesInput.value = "1n, 10n, 100n";
			this.customValuesInput.placeholder = "e.g.\n1n, 10n, 100n";
			this.minResisterInput.inputBox.value = "100p";
			this.maxResisterInput.inputBox.value = "100u";
		} else {
			this.customValuesInput.value = "100, 1k, 10k";
			this.customValuesInput.placeholder = "e.g.\n100, 1k, 10k";
			this.minResisterInput.inputBox.value = "100";
			this.maxResisterInput.inputBox.value = "1M";
		}
		this.customValuesInput.disabled = true;
	}
	getAvailableValues(targetValue) {
		const series = this.seriesSelect.value;
		if (series === "custom") {
			const valueStrs = this.customValuesInput.value.split(",");
			const values = [];
			for (let str of valueStrs) {
				str = str.trim();
				if (str === "") continue;
				const val = evalExpr(str);
				if (!isNaN(val) && !values.includes(val)) values.push(val);
			}
			return values;
		} else {
			const defaultMin = Math.max(1e-12, targetValue / 100);
			const defaultMax = Math.min(0x38d7ea4c68000, targetValue * 100);
			this.minResisterInput.inputBox.placeholder = `(${formatValue(defaultMin, "", true)})`;
			this.maxResisterInput.inputBox.placeholder = `(${formatValue(defaultMax, "", true)})`;
			const minValue = this.minResisterInput.value;
			const maxValue = this.maxResisterInput.value;
			return makeAvaiableValues(series, minValue, maxValue);
		}
	}
	setOnChange(callback) {
		this.seriesSelect.addEventListener("change", () => {
			const custom = this.seriesSelect.value === "custom";
			this.customValuesInput.disabled = !custom;
			this.minResisterInput.inputBox.disabled = custom;
			this.maxResisterInput.inputBox.disabled = custom;
			callback();
		});
		this.customValuesInput.addEventListener("input", () => callback());
		this.customValuesInput.addEventListener("change", () => callback());
		this.minResisterInput.setOnChange(callback);
		this.maxResisterInput.setOnChange(callback);
	}
};
var IntegerBox = class {
	inputBox = document.createElement("input");
	onChangeCallback = () => {};
	constructor(value = null, min = 0, max = 9999, defaultValue = 0, placeholder = "") {
		this.defaultValue = defaultValue;
		this.inputBox.type = "number";
		this.inputBox.min = min.toString();
		this.inputBox.max = max.toString();
		this.inputBox.placeholder = placeholder;
		if (value !== null) this.inputBox.value = value.toString();
	}
	get value() {
		let text = this.inputBox.value.trim();
		if (text !== "") return Math.floor(evalExpr(text));
		else return this.defaultValue;
	}
	setOnChange(callback) {
		this.onChangeCallback = callback;
		this.inputBox.addEventListener("input", () => this.onChange());
		this.inputBox.addEventListener("change", () => this.onChange());
	}
	onChange() {
		try {
			this.inputBox.title = formatValue(this.value);
		} catch (e) {
			this.inputBox.title = e.message;
		}
		this.onChangeCallback();
	}
};
var ValueBox = class {
	inputBox = makeTextBox();
	onChangeCallback = () => {};
	constructor(value = null) {
		if (value) {
			this.inputBox.value = value;
			this.onChange();
		}
	}
	get value() {
		let text = this.inputBox.value.trim();
		if (text === "") text = this.inputBox.placeholder.trim();
		return evalExpr(text);
	}
	setOnChange(callback) {
		this.onChangeCallback = callback;
		this.inputBox.addEventListener("input", () => this.onChange());
		this.inputBox.addEventListener("change", () => this.onChange());
	}
	onChange() {
		try {
			this.inputBox.title = formatValue(this.value);
		} catch (e) {
			this.inputBox.title = e.message;
		}
		this.onChangeCallback();
	}
};
function makeNumElementInput(max, defaultValue) {
	return new IntegerBox(defaultValue, 1, max, max, `(${getStr("No Limit")})`);
}
function makeTopologySelector() {
	return makeSelectBox([
		{
			value: TopologyConstraint.Series.toString(),
			label: getStr("Series")
		},
		{
			value: TopologyConstraint.Parallel.toString(),
			label: getStr("Parallel")
		},
		{
			value: TopologyConstraint.NoLimit.toString(),
			label: getStr("No Limit")
		}
	], TopologyConstraint.NoLimit.toString());
}
function makeDepthSelector() {
	const noLimit = "999";
	return makeSelectBox([
		{
			value: "1",
			label: "1"
		},
		{
			value: "2",
			label: "2"
		},
		{
			value: "3",
			label: "3"
		},
		{
			value: noLimit,
			label: getStr("No Limit")
		}
	], noLimit);
}
function makeH2(label = "") {
	const elm = document.createElement("h2");
	elm.textContent = label;
	return elm;
}
function makeDiv$1(children = [], className = null, center = false) {
	const elm = document.createElement("div");
	toElementArray$1(children).forEach((child) => elm.appendChild(child));
	if (className) elm.classList.add(className);
	if (center) elm.style.textAlign = "center";
	return elm;
}
function makeP(children, className = null, center = false) {
	const elm = document.createElement("p");
	toElementArray$1(children).forEach((child) => elm.appendChild(child));
	if (className) elm.classList.add(className);
	if (center) elm.style.textAlign = "center";
	return elm;
}
function makeTable(rows) {
	let head = true;
	const table = document.createElement("table");
	for (const rowData of rows) {
		const row = document.createElement("tr");
		for (const cellData of rowData) {
			const cell = document.createElement(head ? "th" : "td");
			toElementArray$1(cellData).forEach((child) => cell.appendChild(child));
			row.appendChild(cell);
		}
		head = false;
		table.appendChild(row);
	}
	return table;
}
function makeTextBox(value = null) {
	const elm = document.createElement("input");
	elm.type = "text";
	if (value) elm.value = value;
	return elm;
}
function makeCheckbox(labelStr, value = false) {
	const label = document.createElement("label");
	const elm = document.createElement("input");
	elm.type = "checkbox";
	elm.checked = value;
	label.appendChild(elm);
	label.appendChild(document.createTextNode(" " + labelStr));
	return elm;
}
function makeSeriesSelector() {
	let items = [];
	for (const key of Object.keys(Series)) items.push({
		value: key,
		label: key
	});
	items.push({
		value: "custom",
		label: getStr("Custom")
	});
	return makeSelectBox(items, "E3");
}
function makeSelectBox(items, defaultValue) {
	const select = document.createElement("select");
	for (const item of items) {
		const option = document.createElement("option");
		option.value = item.value;
		option.textContent = item.label;
		if (item.tip) option.title = item.tip;
		select.appendChild(option);
	}
	select.value = defaultValue.toString();
	return select;
}
function toElementArray$1(children) {
	if (children == null) return [];
	if (!Array.isArray(children)) children = [children];
	for (let i = 0; i < children.length; i++) if (typeof children[i] === "string") children[i] = document.createTextNode(children[i]);
	else if (children[i] instanceof Node) {} else throw new Error("Invalid child element");
	return children;
}
function parentTrOf(element) {
	let parent = element;
	while (parent) {
		if (parent.tagName === "TR") return parent;
		parent = parent.parentElement;
	}
	return null;
}
function show(elem) {
	elem.classList.remove("hidden");
	return elem;
}
function hide(elem) {
	elem.classList.add("hidden");
	return elem;
}
function setVisible(elem, visible) {
	return visible ? show(elem) : hide(elem);
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

//#endregion
//#region src/Schematics.ts
const SCALE = 1;
const ELEMENT_SIZE = 40 * SCALE;
const R_WIDTH = ELEMENT_SIZE;
const R_HEIGHT = Math.round(ELEMENT_SIZE * .4);
const C_WIDTH = Math.round(ELEMENT_SIZE * .3);
const C_HEIGHT = Math.round(ELEMENT_SIZE * .7);
const COLOR_CODE_TABLE = [
	"#000",
	"#864",
	"#c00",
	"#f80",
	"#cc0",
	"#080",
	"#04c",
	"#c4c",
	"#888",
	"#fff"
];
function drawResistor(ctx, x, y, value, showColorCode) {
	ctx.save();
	ctx.translate(x, y);
	y += (ELEMENT_SIZE - R_HEIGHT) / 2;
	if (showColorCode) {
		let colors;
		if (value >= 1e-6) {
			const exp = Math.floor(Math.log10(value) + 1e-10) - 1;
			const frac = Math.round(value / Math.pow(10, exp));
			const digits1 = Math.floor(frac / 10) % 10;
			const digits2 = frac % 10;
			const digits3 = exp;
			colors = [
				COLOR_CODE_TABLE[digits1],
				COLOR_CODE_TABLE[digits2],
				COLOR_CODE_TABLE[digits3],
				"#870"
			];
		} else colors = [COLOR_CODE_TABLE[0]];
		const bandWidth = R_WIDTH * .125;
		const bandGap = bandWidth / 2;
		const bandX0 = (R_WIDTH - (bandWidth * colors.length + bandGap * (colors.length - 1))) / 2;
		for (let i = 0; i < colors.length; i++) {
			const x$1 = bandX0 + i * (bandWidth + bandGap);
			ctx.fillStyle = colors[i];
			ctx.fillRect(x$1, y, bandWidth, R_HEIGHT);
		}
	}
	ctx.lineWidth = 2 * SCALE;
	ctx.strokeRect(0, y, R_WIDTH, R_HEIGHT);
	ctx.font = `${16 * SCALE}px sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	const text = formatValue(value, "Ω", true);
	ctx.fillStyle = "#000";
	ctx.fillText(text, R_WIDTH / 2, y - 5 * SCALE);
	ctx.restore();
}
function drawCapacitor(ctx, x, y, value) {
	ctx.save();
	ctx.translate(x, y);
	const x0 = (ELEMENT_SIZE - C_WIDTH) / 2;
	const x1 = x0 + C_WIDTH;
	const y0 = (ELEMENT_SIZE - C_HEIGHT) / 2;
	const y1 = y0 + C_HEIGHT;
	ctx.lineWidth = 4 * SCALE;
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x0, y1);
	ctx.moveTo(x1, y0);
	ctx.lineTo(x1, y1);
	ctx.stroke();
	const yCenter = ELEMENT_SIZE / 2;
	drawWire(ctx, 0, yCenter, x0, yCenter);
	drawWire(ctx, x1, yCenter, ELEMENT_SIZE, yCenter);
	ctx.font = `${16 * SCALE}px sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	const text = formatValue(value, "F", true);
	ctx.fillStyle = "#000";
	ctx.fillText(text, R_WIDTH / 2, y0 - 5 * SCALE);
	ctx.restore();
}
function drawWire(ctx, x0, y0, x1, y1) {
	ctx.save();
	ctx.lineCap = "round";
	ctx.lineWidth = 2 * SCALE;
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.stroke();
	ctx.restore();
}
var TreeNode = class TreeNode {
	x = 0;
	y = 0;
	width = 0;
	height = 0;
	constructor(capacitor, parallel, children, value = -1) {
		this.capacitor = capacitor;
		this.parallel = parallel;
		this.children = children;
		this.value = value;
		if (this.isLeaf) {
			this.width = ELEMENT_SIZE;
			this.height = ELEMENT_SIZE;
		} else if (this.parallel) {
			const X_PADDING = 20 * SCALE;
			const Y_PADDING = 20 * SCALE;
			let maxWidth = 0;
			let totalHeight = 0;
			for (const c of this.children) {
				c.y = totalHeight;
				maxWidth = Math.max(maxWidth, c.width);
				totalHeight += c.height + Y_PADDING;
			}
			for (const c of this.children) c.x = (maxWidth - c.width) / 2 + X_PADDING;
			totalHeight -= Y_PADDING;
			this.width = maxWidth + X_PADDING * 2;
			this.height = totalHeight;
		} else {
			const X_PADDING = 20 * SCALE;
			let totalWidth = 0;
			let maxHeight = 0;
			for (const c of this.children) {
				c.x = totalWidth;
				totalWidth += c.width + X_PADDING;
				maxHeight = Math.max(maxHeight, c.height);
			}
			for (const c of this.children) c.y = (maxHeight - c.height) / 2;
			totalWidth -= X_PADDING;
			this.width = totalWidth;
			this.height = maxHeight;
		}
	}
	static fromJSON(capacitor, json) {
		if (typeof json === "number") return new TreeNode(capacitor, false, [], json);
		else {
			const value = json.value;
			const parallel = json.parallel;
			const children = [];
			for (const childJson of json.children) children.push(TreeNode.fromJSON(capacitor, childJson));
			return new TreeNode(capacitor, parallel, children, value);
		}
	}
	scale(dx, dy, xScale, yScale) {
		this.x *= xScale;
		this.y *= yScale;
		this.width *= xScale;
		this.height *= yScale;
		for (const c of this.children) c.scale(dx, dy, xScale, yScale);
	}
	offset(dx, dy) {
		this.x += dx;
		this.y += dy;
	}
	draw(ctx, showColorCode) {
		ctx.save();
		ctx.translate(this.x, this.y);
		if (this.isLeaf) if (this.capacitor) drawCapacitor(ctx, 0, 0, this.value);
		else drawResistor(ctx, 0, 0, this.value, showColorCode);
		else if (this.parallel) {
			let y0 = 0;
			let y1 = 0;
			for (let i = 0; i < this.children.length; i++) {
				const c = this.children[i];
				const x0 = c.x;
				const x1 = c.x + c.width;
				const y = c.y + c.height / 2;
				drawWire(ctx, 0, y, x0, y);
				drawWire(ctx, x1, y, this.width, y);
				if (i === 0) y0 = y;
				y1 = y;
			}
			drawWire(ctx, 0, y0, 0, y1);
			drawWire(ctx, this.width, y0, this.width, y1);
		} else {
			const y = this.height / 2;
			for (let i = 0; i < this.children.length - 1; i++) {
				const x0 = this.children[i].x + this.children[i].width;
				const x1 = this.children[i + 1].x;
				drawWire(ctx, x0, y, x1, y);
			}
		}
		for (const c of this.children) c.draw(ctx, showColorCode);
		ctx.restore();
	}
	get isLeaf() {
		return this.children.length === 0;
	}
};

//#endregion
//#region src/WorkerAgents.ts
var WorkerAgent = class {
	worker = null;
	workerRunning = false;
	startRequestParams = {};
	startRequestTimerId = null;
	lastLaunchedParams = {};
	onFinished = null;
	onAborted = null;
	requestStart(p) {
		if (JSON.stringify(p) === JSON.stringify(this.startRequestParams)) return false;
		this.cancelRequest();
		this.startRequestParams = p;
		this.startRequestTimerId = window.setTimeout(async () => {
			this.startRequestTimerId = null;
			await this.startWorker();
		}, 100);
		return true;
	}
	cancelRequest() {
		if (this.startRequestTimerId !== null) {
			window.clearTimeout(this.startRequestTimerId);
			this.startRequestTimerId = null;
		}
	}
	async startWorker() {
		this.abortWorker();
		if (this.worker === null) {
			console.log("Starting worker...");
			this.worker = new Worker("../worker/index.mjs?fda53fa5", { type: "module" });
			console.log("Worker started.");
			this.worker.onmessage = (e) => this.onMessaged(e);
			this.worker.onerror = (e) => this.onError(e.message);
			this.worker.onmessageerror = (e) => this.onError("Message error in worker");
			console.log("Worker event handlers set.");
		}
		this.lastLaunchedParams = JSON.parse(JSON.stringify(this.startRequestParams));
		console.log("Posting message to worker:", this.startRequestParams);
		this.worker.postMessage(this.startRequestParams);
		console.log("Message posted.");
		this.workerRunning = true;
	}
	abortWorker() {
		if (!this.workerRunning) return;
		if (this.worker !== null) {
			this.worker.terminate();
			this.worker = null;
		}
		this.workerRunning = false;
	}
	onMessaged(e) {
		this.workerRunning = false;
		if (this.onFinished) {
			let ret = e.data;
			ret.params = this.lastLaunchedParams;
			this.onFinished(ret);
		}
		if (this.startRequestTimerId !== null) {
			window.clearTimeout(this.startRequestTimerId);
			this.startRequestTimerId = null;
			this.startWorker();
		}
	}
	onError(msg) {
		this.abortWorker();
		if (this.onAborted) this.onAborted(msg);
	}
};

//#endregion
//#region src/CombinationFinderUi.ts
var CombinationFinderUi = class {
	rangeSelector = null;
	numElementsInput = makeNumElementInput(MAX_COMBINATION_ELEMENTS, 3);
	topTopologySelector = makeTopologySelector();
	maxDepthInput = makeDepthSelector();
	resultBox = makeDiv$1();
	resCombInputBox = null;
	ui = null;
	workerAgent = new WorkerAgent();
	lastResult = null;
	constructor(commonSettingsUi, capacitor) {
		this.commonSettingsUi = commonSettingsUi;
		this.capacitor = capacitor;
		const unit = capacitor ? "F" : "Ω";
		this.rangeSelector = new ValueRangeSelector(capacitor);
		this.resCombInputBox = new ValueBox(capacitor ? "3.14μ" : "5.1k");
		this.ui = makeDiv$1([
			makeH2(this.capacitor ? getStr("Find Capacitor Combinations") : getStr("Find Resistor Combinations")),
			makeTable([
				[
					getStr("Item"),
					getStr("Value"),
					getStr("Unit")
				],
				[
					getStr("E Series"),
					this.rangeSelector.seriesSelect,
					""
				],
				[
					getStr("Custom Values"),
					this.rangeSelector.customValuesInput,
					unit
				],
				[
					getStr("Minimum"),
					this.rangeSelector.minResisterInput.inputBox,
					unit
				],
				[
					getStr("Maximum"),
					this.rangeSelector.maxResisterInput.inputBox,
					unit
				],
				[
					getStr("Max Elements"),
					this.numElementsInput.inputBox,
					""
				],
				[
					getStr("Top Topology"),
					this.topTopologySelector,
					""
				],
				[
					getStr("Max Nests"),
					this.maxDepthInput,
					""
				],
				[
					getStr("Target Value"),
					this.resCombInputBox.inputBox,
					unit
				]
			]),
			this.resultBox
		]);
		this.commonSettingsUi.onChanged.push(() => this.conditionChanged());
		this.rangeSelector.setOnChange(() => this.conditionChanged());
		this.resCombInputBox.setOnChange(() => this.conditionChanged());
		this.numElementsInput.setOnChange(() => this.conditionChanged());
		this.topTopologySelector.addEventListener("change", () => this.conditionChanged());
		this.maxDepthInput.addEventListener("change", () => this.conditionChanged());
		this.workerAgent.onFinished = (e) => this.onFinished(e);
		this.workerAgent.onAborted = (msg) => this.onAborted(msg);
		this.conditionChanged();
	}
	conditionChanged() {
		try {
			const rangeSelector = this.rangeSelector;
			const custom = rangeSelector.seriesSelect.value === "custom";
			setVisible(parentTrOf(rangeSelector.customValuesInput), custom);
			setVisible(parentTrOf(rangeSelector.minResisterInput.inputBox), !custom);
			setVisible(parentTrOf(rangeSelector.maxResisterInput.inputBox), !custom);
			const targetValue = this.resCombInputBox.value;
			const topoConstr = parseInt(this.topTopologySelector.value);
			const p = {
				useWasm: this.commonSettingsUi.useWasmCheckbox.checked,
				method: Method.FindCombination,
				capacitor: this.capacitor,
				values: rangeSelector.getAvailableValues(targetValue),
				maxElements: this.numElementsInput.value,
				topologyConstraint: topoConstr,
				maxDepth: parseInt(this.maxDepthInput.value),
				targetValue
			};
			if (!this.workerAgent.requestStart(p)) this.showResult();
		} catch (e) {
			this.workerAgent.cancelRequest();
		}
	}
	onFinished(e) {
		this.lastResult = e;
		this.showResult();
	}
	onAborted(msg) {
		console.log(`Aborted with message: '${msg}'`);
		this.resultBox.textContent = getStr(msg);
	}
	showResult() {
		this.resultBox.innerHTML = "";
		const ret = this.lastResult;
		if (ret === null) return;
		try {
			this.resultBox.innerHTML = "";
			if (ret.error && ret.error.length > 0) throw new Error(ret.error);
			const targetValue = ret.params.targetValue;
			const timeSpentMs = ret.timeSpent;
			const msg = `${getStr("<n> combinations found", { n: ret.result.length })} (${getStr("Search Time")}: ${timeSpentMs.toFixed(2)} ms):`;
			this.resultBox.appendChild(makeP(msg));
			for (const combJson of ret.result) {
				const PADDING = 20;
				const CAPTION_HEIGHT = 50;
				const LEAD_LENGTH = 40 * SCALE;
				const node = TreeNode.fromJSON(this.capacitor, combJson);
				node.offset(-node.x, -node.y);
				const DISP_W = 300;
				const DISP_H = 300;
				const EDGE_SIZE = Math.max(node.width + LEAD_LENGTH * 2 + PADDING * 2, node.height + CAPTION_HEIGHT + PADDING * 3);
				const W = Math.max(DISP_W, EDGE_SIZE);
				const H = Math.max(DISP_H, EDGE_SIZE);
				const FIGURE_PLACE_W = W - PADDING * 2;
				const FIGURE_PLACE_H = H - CAPTION_HEIGHT - PADDING * 3;
				const canvas = document.createElement("canvas");
				canvas.width = W;
				canvas.height = H;
				canvas.style.width = `${DISP_W}px`;
				canvas.style.height = "auto";
				canvas.className = "figure";
				const ctx = canvas.getContext("2d");
				ctx.fillStyle = "#fff";
				ctx.fillRect(0, 0, W, H);
				{
					ctx.save();
					ctx.strokeStyle = "#000";
					const dx = PADDING + (FIGURE_PLACE_W - node.width) / 2;
					const dy = PADDING + (FIGURE_PLACE_H - node.height) / 2;
					ctx.translate(dx, dy);
					node.draw(ctx, this.commonSettingsUi.showColorCodeCheckbox.checked);
					const y = node.height / 2;
					const x0 = -LEAD_LENGTH;
					const x1 = 0;
					const x2 = node.width;
					const x3 = node.width + LEAD_LENGTH;
					drawWire(ctx, x0, y, x1, y);
					drawWire(ctx, x2, y, x3, y);
					ctx.restore();
				}
				ctx.save();
				ctx.translate(W / 2, H - PADDING - CAPTION_HEIGHT);
				ctx.fillStyle = "#000";
				ctx.textAlign = "center";
				ctx.textBaseline = "top";
				{
					const text = formatValue(node.value, this.capacitor ? "F" : "Ω", true);
					ctx.font = `${24 * SCALE}px sans-serif`;
					ctx.fillText(text, 0, 0);
				}
				{
					let error = (node.value - targetValue) / targetValue;
					let errorStr = getStr("No Error");
					ctx.save();
					if (Math.abs(error) > targetValue / 1e9) {
						errorStr = `${getStr("Error")}: ${error > 0 ? "+" : ""}${(error * 100).toFixed(4)}%`;
						ctx.fillStyle = error > 0 ? "#c00" : "#00c";
					}
					ctx.font = `${16 * SCALE}px sans-serif`;
					ctx.fillText(`(${errorStr})`, 0, 30);
					ctx.restore();
				}
				ctx.restore();
				this.resultBox.appendChild(canvas);
				this.resultBox.appendChild(document.createTextNode(" "));
			}
		} catch (e) {
			let msg = "Unknown error";
			if (e.message) msg = e.message;
			this.resultBox.textContent = getStr(msg);
		}
	}
};

//#endregion
//#region src/Ui.ts
function makeDiv(children = [], className = null, center = false) {
	const elm = document.createElement("div");
	toElementArray(children).forEach((child) => elm.appendChild(child));
	if (className) elm.classList.add(className);
	if (center) elm.style.textAlign = "center";
	return elm;
}
function toElementArray(children) {
	if (children == null) return [];
	if (!Array.isArray(children)) children = [children];
	for (let i = 0; i < children.length; i++) if (typeof children[i] === "string") children[i] = document.createTextNode(children[i]);
	else if (children[i] instanceof Node) {} else throw new Error("Invalid child element");
	return children;
}

//#endregion
//#region src/main.ts
function main(container) {
	const commonSettingsUi = new CommonSettingsUi();
	const resCombFinderUi = new CombinationFinderUi(commonSettingsUi, false);
	const capCombFinderUi = new CombinationFinderUi(commonSettingsUi, true);
	container.appendChild(makeDiv([
		commonSettingsUi.ui,
		resCombFinderUi.ui,
		capCombFinderUi.ui
	]));
}

//#endregion
export { main };