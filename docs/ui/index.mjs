//#region ../../lib/ts/src/RcmbJS.ts
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
function formatValue$1(value, unit = "", usePrefix = null) {
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
	value = Math.round(value * pow10$1(minDigits));
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
function pow10$1(exp) {
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
const Serieses = {
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
	],
	"E48": [
		100,
		105,
		110,
		115,
		121,
		127,
		133,
		140,
		147,
		154,
		162,
		169,
		178,
		187,
		196,
		205,
		215,
		226,
		237,
		249,
		261,
		274,
		287,
		301,
		316,
		332,
		348,
		365,
		383,
		402,
		422,
		442,
		464,
		487,
		511,
		536,
		562,
		590,
		619,
		649,
		681,
		715,
		750,
		787,
		825,
		866,
		909,
		953
	],
	"E96": [
		100,
		102,
		105,
		107,
		110,
		113,
		115,
		118,
		121,
		124,
		127,
		130,
		133,
		137,
		140,
		143,
		147,
		150,
		154,
		158,
		162,
		165,
		169,
		174,
		178,
		182,
		187,
		191,
		196,
		200,
		205,
		210,
		215,
		221,
		226,
		232,
		237,
		243,
		249,
		255,
		261,
		267,
		274,
		280,
		287,
		294,
		301,
		309,
		316,
		324,
		332,
		340,
		348,
		357,
		365,
		374,
		383,
		392,
		402,
		412,
		422,
		432,
		442,
		453,
		464,
		475,
		487,
		499,
		511,
		523,
		536,
		549,
		562,
		576,
		590,
		604,
		619,
		634,
		649,
		665,
		681,
		698,
		715,
		732,
		750,
		768,
		787,
		806,
		825,
		845,
		866,
		887,
		909,
		931,
		953,
		976
	],
	"E192": [
		100,
		101,
		102,
		104,
		105,
		106,
		107,
		109,
		110,
		111,
		113,
		114,
		115,
		117,
		118,
		120,
		121,
		123,
		124,
		126,
		127,
		129,
		130,
		132,
		133,
		135,
		137,
		138,
		140,
		142,
		143,
		145,
		147,
		149,
		150,
		152,
		154,
		156,
		158,
		160,
		162,
		164,
		165,
		167,
		169,
		172,
		174,
		176,
		178,
		180,
		182,
		184,
		187,
		189,
		191,
		193,
		196,
		198,
		200,
		203,
		205,
		208,
		210,
		213,
		215,
		218,
		221,
		223,
		226,
		229,
		232,
		234,
		237,
		240,
		243,
		246,
		249,
		252,
		255,
		258,
		261,
		264,
		267,
		271,
		274,
		277,
		280,
		284,
		287,
		291,
		294,
		298,
		301,
		305,
		309,
		312,
		316,
		320,
		324,
		328,
		332,
		336,
		340,
		344,
		348,
		352,
		357,
		361,
		365,
		370,
		374,
		379,
		383,
		388,
		392,
		397,
		402,
		407,
		412,
		417,
		422,
		427,
		432,
		437,
		442,
		448,
		453,
		459,
		464,
		470,
		475,
		481,
		487,
		493,
		499,
		505,
		511,
		517,
		523,
		530,
		536,
		542,
		549,
		556,
		562,
		569,
		576,
		583,
		590,
		597,
		604,
		612,
		619,
		626,
		634,
		642,
		649,
		657,
		665,
		673,
		681,
		690,
		698,
		706,
		715,
		723,
		732,
		741,
		750,
		759,
		768,
		777,
		787,
		796,
		806,
		816,
		825,
		835,
		845,
		856,
		866,
		876,
		887,
		898,
		909,
		920,
		931,
		942,
		953,
		965,
		976,
		988
	],
	"E24+E48": [
		100,
		105,
		110,
		115,
		120,
		121,
		127,
		130,
		133,
		140,
		147,
		150,
		154,
		160,
		162,
		169,
		178,
		180,
		187,
		196,
		200,
		205,
		215,
		220,
		226,
		237,
		240,
		249,
		261,
		270,
		274,
		287,
		300,
		301,
		316,
		330,
		332,
		348,
		360,
		365,
		383,
		390,
		402,
		422,
		430,
		442,
		464,
		470,
		487,
		510,
		511,
		536,
		560,
		562,
		590,
		619,
		620,
		649,
		680,
		681,
		715,
		750,
		787,
		820,
		825,
		866,
		909,
		910,
		953
	],
	"E24+E96": [
		100,
		102,
		105,
		107,
		110,
		113,
		115,
		118,
		120,
		121,
		124,
		127,
		130,
		133,
		137,
		140,
		143,
		147,
		150,
		154,
		158,
		160,
		162,
		165,
		169,
		174,
		178,
		180,
		182,
		187,
		191,
		196,
		200,
		205,
		210,
		215,
		220,
		221,
		226,
		232,
		237,
		240,
		243,
		249,
		255,
		261,
		267,
		270,
		274,
		280,
		287,
		294,
		300,
		301,
		309,
		316,
		324,
		330,
		332,
		340,
		348,
		357,
		360,
		365,
		374,
		383,
		390,
		392,
		402,
		412,
		422,
		430,
		432,
		442,
		453,
		464,
		470,
		475,
		487,
		499,
		510,
		511,
		523,
		536,
		549,
		560,
		562,
		576,
		590,
		604,
		619,
		620,
		634,
		649,
		665,
		680,
		681,
		698,
		715,
		732,
		750,
		768,
		787,
		806,
		820,
		825,
		845,
		866,
		887,
		909,
		910,
		931,
		953,
		976
	],
	"E24+E192": [
		100,
		101,
		102,
		104,
		105,
		106,
		107,
		109,
		110,
		111,
		113,
		114,
		115,
		117,
		118,
		120,
		121,
		123,
		124,
		126,
		127,
		129,
		130,
		132,
		133,
		135,
		137,
		138,
		140,
		142,
		143,
		145,
		147,
		149,
		150,
		152,
		154,
		156,
		158,
		160,
		162,
		164,
		165,
		167,
		169,
		172,
		174,
		176,
		178,
		180,
		182,
		184,
		187,
		189,
		191,
		193,
		196,
		198,
		200,
		203,
		205,
		208,
		210,
		213,
		215,
		218,
		220,
		221,
		223,
		226,
		229,
		232,
		234,
		237,
		240,
		243,
		246,
		249,
		252,
		255,
		258,
		261,
		264,
		267,
		270,
		271,
		274,
		277,
		280,
		284,
		287,
		291,
		294,
		298,
		300,
		301,
		305,
		309,
		312,
		316,
		320,
		324,
		328,
		330,
		332,
		336,
		340,
		344,
		348,
		352,
		357,
		360,
		361,
		365,
		370,
		374,
		379,
		383,
		388,
		390,
		392,
		397,
		402,
		407,
		412,
		417,
		422,
		427,
		430,
		432,
		437,
		442,
		448,
		453,
		459,
		464,
		470,
		475,
		481,
		487,
		493,
		499,
		505,
		510,
		511,
		517,
		523,
		530,
		536,
		542,
		549,
		556,
		560,
		562,
		569,
		576,
		583,
		590,
		597,
		604,
		612,
		619,
		620,
		626,
		634,
		642,
		649,
		657,
		665,
		673,
		680,
		681,
		690,
		698,
		706,
		715,
		723,
		732,
		741,
		750,
		759,
		768,
		777,
		787,
		796,
		806,
		816,
		820,
		825,
		835,
		845,
		856,
		866,
		876,
		887,
		898,
		909,
		910,
		920,
		931,
		942,
		953,
		965,
		976,
		988
	]
};
function makeAvaiableValues(series, minValue = 1e-12, maxValue = 0xe8d4a51000) {
	const baseValues = Serieses[series];
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
	"Target Current": "目標電流",
	"E Series": "E系列",
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
	"No combinations found": "組み合わせが見つかりませんでした",
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
	"Show Color Code": "カラーコード表示",
	"Searching...": "探索しています...",
	"Power Loss": "損失",
	"Current": "電流",
	"Resistor": "抵抗",
	"Same as Above": "同上",
	"Filter": "フィルター",
	"Target": "目標値",
	"Exact": "一致",
	"Above": "目標以上",
	"Below": "目標以下",
	"Nearest": "近似値",
	"None": "なし",
	"Home": "ホーム",
	"Resistor Combination": "合成抵抗",
	"Capacitor Combination": "合成容量",
	"Current Limitting": "電流制限抵抗",
	"Voltage Divider": "分圧抵抗"
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
	showColorCodeCheckbox = makeCheckbox(getStr("Show Color Code"), false);
	ui = makeDiv([document.createElement("hr"), this.useWasmCheckbox.parentNode], null, true);
	onChanged = [];
	constructor() {
		this.useWasmCheckbox.addEventListener("change", () => {
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
	inputBox = document.createElement("input");
	onChangeCallback = () => {};
	constructor(value = null) {
		this.inputBox.type = isMobile ? "text" : "tel";
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
var FilterBox = class {
	selector = makeSelectBox([
		{
			value: Filter.Exact.toString(),
			label: getStr("Exact")
		},
		{
			value: Filter.Below.toString(),
			label: getStr("Below")
		},
		{
			value: Filter.Above.toString(),
			label: getStr("Above")
		},
		{
			value: Filter.Nearest.toString(),
			label: getStr("Nearest")
		}
	], Filter.Nearest.toString());
	ui = this.selector;
	callbacks = [];
	constructor() {
		this.selector.addEventListener("change", () => {
			this.callbacks.forEach((cb) => cb());
		});
	}
	setOnChange(callback) {
		this.callbacks.push(callback);
	}
	get value() {
		return parseInt(this.selector.value);
	}
};
const isMobile = (() => {
	return !!navigator.userAgent.match(/iPhone|Android.+Mobile/);
})();
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
function makeDiv(children = [], className = null, center = false) {
	const elm = document.createElement("div");
	toElementArray(children).forEach((child) => elm.appendChild(child));
	if (className) elm.classList.add(className);
	if (center) elm.style.textAlign = "center";
	return elm;
}
function makeP(children = [], className = null, center = false) {
	const elm = document.createElement("p");
	toElementArray(children).forEach((child) => elm.appendChild(child));
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
			toElementArray(cellData).forEach((child) => cell.appendChild(child));
			row.appendChild(cell);
		}
		head = false;
		table.appendChild(row);
	}
	return table;
}
function makeSpan(children = null, className = null) {
	const elm = document.createElement("span");
	toElementArray(children).forEach((child) => elm.appendChild(child));
	if (className) elm.classList.add(className);
	return elm;
}
function strong(children = null) {
	const elm = document.createElement("strong");
	toElementArray(children).forEach((child) => elm.appendChild(child));
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
	for (const key of Object.keys(Serieses)) items.push({
		value: key,
		label: key.replace("+", " + ")
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
function makeButton(label = "") {
	const elm = document.createElement("button");
	elm.textContent = label;
	return elm;
}
function makeIcon(emoji, spin = false) {
	const icon = makeSpan(emoji, "icon");
	if (spin) icon.classList.add("spin");
	return icon;
}
function toElementArray(children) {
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
	const exp = Math.floor(Math.log10(Math.abs(value)) + 1e-6);
	let prefix = "";
	if (usePrefix) {
		if (exp >= 12) {
			value /= 0xe8d4a51000;
			prefix = "T";
		} else if (exp >= 9) {
			value /= 1e9;
			prefix = "G";
		} else if (exp >= 6) {
			value /= 1e6;
			prefix = "M";
		} else if (exp >= 3) {
			value /= 1e3;
			prefix = "k";
		} else if (exp >= 0) prefix = "";
		else if (exp >= -3) {
			value *= 1e3;
			prefix = "m";
		} else if (exp >= -6) {
			value *= 1e6;
			prefix = "μ";
		} else if (exp >= -9) {
			value *= 1e9;
			prefix = "n";
		} else if (exp >= -12) {
			value *= 0xe8d4a51000;
			prefix = "p";
		}
	}
	const minDigits = 6;
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
	"#963",
	"#c00",
	"#f80",
	"#fe0",
	"#080",
	"#04c",
	"#c4c",
	"#888",
	"#fff",
	"gold",
	"silver"
];
function drawResistor(ctx, x, y, value, showColorCode) {
	ctx.save();
	ctx.translate(x, y);
	y += (ELEMENT_SIZE - R_HEIGHT) / 2;
	if (showColorCode) {
		let colors = [];
		if (value >= 1e-6) {
			const exp = Math.floor(Math.log10(value) + 1e-10) - 2;
			const frac = Math.round(value / Math.pow(10, exp));
			const digit0 = Math.floor(frac / 100) % 10;
			const digit1 = Math.floor(frac / 10) % 10;
			const digit2 = frac % 10;
			const digit3 = Math.floor(frac * 10) % 10;
			const digit4 = digit2 !== 0 ? exp : exp + 1;
			const color4 = digit4 <= -2 ? "silver" : digit4 === -1 ? "gold" : digit4 >= 10 ? "#fff" : COLOR_CODE_TABLE[digit4];
			if (digit3 !== 0 || digit4 < -2 || digit4 > 9) {} else if (digit2 !== 0) colors = [
				COLOR_CODE_TABLE[digit0],
				COLOR_CODE_TABLE[digit1],
				COLOR_CODE_TABLE[digit2],
				color4,
				COLOR_CODE_TABLE[1]
			];
			else colors = [
				COLOR_CODE_TABLE[digit0],
				COLOR_CODE_TABLE[digit1],
				color4,
				COLOR_CODE_TABLE[1]
			];
		} else colors = [COLOR_CODE_TABLE[0]];
		if (colors.length > 0) {
			const bandWidth = R_WIDTH * .12;
			const bandGap = bandWidth / 2;
			const bandX0 = (R_WIDTH - (bandWidth * colors.length + bandGap * (colors.length - 1))) / 2;
			ctx.fillStyle = "#ccc";
			ctx.fillRect(0, y, R_WIDTH, R_HEIGHT);
			for (let i = 0; i < colors.length; i++) {
				const x$1 = bandX0 + i * (bandWidth + bandGap);
				if (colors[i] === "silver" || colors[i] === "gold") {
					const gradient = ctx.createLinearGradient(0, y, 0, y + R_HEIGHT);
					if (colors[i] === "gold") {
						gradient.addColorStop(0, "#fff");
						gradient.addColorStop(.5, "#fc0");
						gradient.addColorStop(1, "#840");
					} else {
						gradient.addColorStop(0, "#fff");
						gradient.addColorStop(.5, "#888");
						gradient.addColorStop(1, "#444");
					}
					ctx.fillStyle = gradient;
				} else ctx.fillStyle = colors[i];
				ctx.fillRect(x$1, y, bandWidth, R_HEIGHT);
			}
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
//#region src/UiPages.ts
var UiPage = class {
	ui = null;
	constructor(title) {
		this.title = title;
	}
};

//#endregion
//#region src/WorkerAgents.ts
var WorkerAgent = class {
	urlPostfix = Math.floor(Date.now() / (60 * 1e3)).toString();
	worker = null;
	workerRunning = false;
	startRequestParams = {};
	startRequestTimerId = null;
	lastLaunchedParams = {};
	onLaunched = null;
	onFinished = null;
	onAborted = null;
	requestStart(p) {
		if (JSON.stringify(p) === JSON.stringify(this.startRequestParams)) return this.workerRunning;
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
			const workerUrl = `${window.location.hostname === "localhost" ? "" : "/rc-combinator"}/worker/index.mjs?${this.urlPostfix}`;
			console.log(`Launching worker: '${workerUrl}'`);
			this.worker = new Worker(workerUrl, { type: "module" });
			console.log("Worker started.");
			this.worker.onmessage = (e) => this.onMessaged(e);
			this.worker.onerror = (e) => this.onError(e.message);
			this.worker.onmessageerror = (e) => this.onError("Message error in worker");
		}
		this.lastLaunchedParams = JSON.parse(JSON.stringify(this.startRequestParams));
		this.worker.postMessage(this.startRequestParams);
		this.workerRunning = true;
		if (this.onLaunched) this.onLaunched(this.lastLaunchedParams);
	}
	abortWorker() {
		if (!this.workerRunning) return;
		console.log("Aborting worker...");
		if (this.worker !== null) {
			try {
				this.worker.terminate();
			} catch (e) {
				console.error("Failed to terminate worker:", e);
			}
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
var CombinationFinderUi = class extends UiPage {
	rangeSelector = null;
	numElementsInput = makeNumElementInput(MAX_COMBINATION_ELEMENTS, 3);
	topTopologySelector = makeTopologySelector();
	maxDepthInput = makeDepthSelector();
	statusBox = makeP();
	resultBox = makeDiv();
	targetInput = null;
	filterSelector = new FilterBox();
	unit = "";
	workerAgent = new WorkerAgent();
	lastResult = null;
	constructor(commonSettingsUi$1, capacitor) {
		super(getStr((capacitor ? "Capacitor" : "Resistor") + " Combination"));
		this.commonSettingsUi = commonSettingsUi$1;
		this.capacitor = capacitor;
		this.unit = capacitor ? "F" : "Ω";
		this.rangeSelector = new ValueRangeSelector(capacitor);
		this.targetInput = new ValueBox(capacitor ? "3.14μ" : "5.1k");
		const paramTable = makeTable([
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
				this.unit
			],
			[
				getStr("Minimum"),
				this.rangeSelector.minResisterInput.inputBox,
				this.unit
			],
			[
				getStr("Maximum"),
				this.rangeSelector.maxResisterInput.inputBox,
				this.unit
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
				strong(getStr("Target Value")),
				this.targetInput.inputBox,
				this.unit
			],
			[
				getStr("Filter"),
				this.filterSelector.ui,
				""
			]
		]);
		this.ui = makeDiv([
			makeH2(this.capacitor ? getStr("Find Capacitor Combinations") : getStr("Find Resistor Combinations")),
			paramTable,
			this.statusBox,
			this.resultBox
		]);
		this.commonSettingsUi.onChanged.push(() => this.conditionChanged());
		this.rangeSelector.setOnChange(() => this.conditionChanged());
		this.numElementsInput.setOnChange(() => this.conditionChanged());
		this.topTopologySelector.addEventListener("change", () => this.conditionChanged());
		this.maxDepthInput.addEventListener("change", () => this.conditionChanged());
		this.targetInput.setOnChange(() => this.conditionChanged());
		this.filterSelector.setOnChange(() => this.conditionChanged());
		this.workerAgent.onLaunched = (p) => this.onLaunched(p);
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
			const targetValue = this.targetInput.value;
			const topoConstr = parseInt(this.topTopologySelector.value);
			const p = {
				useWasm: this.commonSettingsUi.useWasmCheckbox.checked,
				method: Method.FindCombination,
				capacitor: this.capacitor,
				values: rangeSelector.getAvailableValues(targetValue),
				maxElements: this.numElementsInput.value,
				topologyConstraint: topoConstr,
				maxDepth: parseInt(this.maxDepthInput.value),
				targetValue,
				filter: this.filterSelector.value
			};
			if (!this.workerAgent.requestStart(p)) this.showResult();
		} catch (e) {
			this.workerAgent.cancelRequest();
		}
	}
	onLaunched(p) {
		this.statusBox.style.color = "";
		this.statusBox.innerHTML = "";
		const msg = `${getStr("Searching...")} (${formatValue(p.targetValue, this.unit)}):`;
		this.statusBox.appendChild(makeIcon("⌛", true));
		this.statusBox.appendChild(document.createTextNode(" " + msg));
		this.resultBox.style.opacity = "0.5";
	}
	onFinished(e) {
		this.lastResult = e;
		this.showResult();
	}
	onAborted(msg) {
		console.log(`Aborted with message: '${msg}'`);
		this.statusBox.innerHTML = "";
		this.statusBox.style.color = msg ? "#c00" : "#000";
		if (msg) {
			this.statusBox.appendChild(makeIcon("❌"));
			this.statusBox.appendChild(document.createTextNode(getStr(msg)));
		}
		this.resultBox.innerHTML = "";
	}
	showResult() {
		this.resultBox.innerHTML = "";
		this.statusBox.innerHTML = "";
		const ret = this.lastResult;
		if (ret === null) return;
		try {
			if (ret.error && ret.error.length > 0) throw new Error(ret.error);
			const targetValue = ret.params.targetValue;
			const timeSpentMs = ret.timeSpent;
			let msg = getStr("No combinations found");
			if (ret.result.length > 0) msg = `${getStr("<n> combinations found", { n: ret.result.length })}`;
			msg += ` (${timeSpentMs.toFixed(2)} ms):`;
			this.statusBox.appendChild(makeIcon("✅"));
			this.statusBox.appendChild(document.createTextNode(msg));
			for (const combJson of ret.result) {
				const PADDING = 20;
				const TOP_PADDING = 20;
				const CAPTION_HEIGHT = 50;
				const LEAD_LENGTH = 40 * SCALE;
				const tree = TreeNode.fromJSON(this.capacitor, combJson);
				tree.offset(-tree.x, -tree.y);
				const DISP_W = 300;
				const DISP_H = 300;
				const EDGE_SIZE = Math.max(tree.width + LEAD_LENGTH * 2 + PADDING * 2, tree.height + CAPTION_HEIGHT + TOP_PADDING + PADDING * 3);
				const W = Math.max(DISP_W, EDGE_SIZE);
				const H = Math.max(DISP_H, EDGE_SIZE);
				const FIGURE_PLACE_W = W - PADDING * 2;
				const FIGURE_PLACE_H = H - CAPTION_HEIGHT - TOP_PADDING - PADDING * 3;
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
					const dx = PADDING + (FIGURE_PLACE_W - tree.width) / 2;
					const dy = PADDING + (FIGURE_PLACE_H - tree.height) / 2 + TOP_PADDING;
					ctx.translate(dx, dy);
					tree.draw(ctx, this.commonSettingsUi.showColorCodeCheckbox.checked);
					const y = tree.height / 2;
					const x0 = -LEAD_LENGTH;
					const x1 = 0;
					const x2 = tree.width;
					const x3 = tree.width + LEAD_LENGTH;
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
					const text = formatValue(tree.value, this.unit, true);
					ctx.font = `${24 * SCALE}px sans-serif`;
					ctx.fillText(text, 0, 0);
				}
				{
					let error = (tree.value - targetValue) / targetValue;
					let errorStr = getStr("No Error");
					ctx.save();
					if (Math.abs(error) > 1e-9) {
						errorStr = `${getStr("Error")}: ${error > 0 ? "+" : ""}${(error * 100).toFixed(6)}%`;
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
			this.statusBox.style.color = "";
			this.resultBox.style.opacity = "";
		} catch (e) {
			let msg = "Unknown error";
			if (e.message) msg = e.message;
			this.statusBox.style.color = "#c00";
			this.statusBox.appendChild(makeIcon("❌"));
			this.statusBox.appendChild(document.createTextNode(`Error: ${getStr(msg)}`));
			this.resultBox.innerHTML = "";
		}
	}
};

//#endregion
//#region src/CurrentLimitterFinderUi.ts
var CurrentLimitterFinderUi = class extends UiPage {
	powerVoltageInput = new ValueBox("3.3");
	forwardVoltageInput = new ValueBox("2");
	forwardCurrentInput = new ValueBox("1m");
	filterSelector = new FilterBox();
	resultBox = makeDiv();
	constructor() {
		super(getStr("Current Limitting"));
		this.ui = makeDiv([
			makeH2(getStr("Find LED Current Limiting Resistor")),
			makeTable([
				[
					getStr("Item"),
					getStr("Value"),
					getStr("Unit")
				],
				[
					getStr("Power Voltage"),
					this.powerVoltageInput.inputBox,
					"V"
				],
				[
					getStr("Forward Voltage"),
					this.forwardVoltageInput.inputBox,
					"V"
				],
				[
					strong(getStr("Target Current")),
					this.forwardCurrentInput.inputBox,
					"A"
				],
				[
					getStr("Filter"),
					this.filterSelector.ui,
					""
				]
			]),
			makeP("結果:"),
			this.resultBox
		]);
		this.powerVoltageInput.setOnChange(() => this.conditionChanged());
		this.forwardVoltageInput.setOnChange(() => this.conditionChanged());
		this.forwardCurrentInput.setOnChange(() => this.conditionChanged());
		this.filterSelector.setOnChange(() => this.conditionChanged());
		this.conditionChanged();
	}
	conditionChanged() {
		this.resultBox.innerHTML = "";
		try {
			const vCC = this.powerVoltageInput.value;
			const vF = this.forwardVoltageInput.value;
			const iF = this.forwardCurrentInput.value;
			const vR = vCC - vF;
			const rIdeal = vR / iF;
			let results = [{
				label: getStr("Ideal Value"),
				r: formatValue$1(rIdeal, "", true),
				i: formatValue$1(iF, "", true),
				e: "",
				p: formatValue$1(vR * iF, "", true)
			}];
			let rLast = 0;
			for (const seriesName in Serieses) {
				const series = makeAvaiableValues(seriesName);
				const filter = this.filterSelector.value;
				let rApprox = NaN;
				{
					const epsilon = iF * 1e-6;
					let bestDiff = Number.MAX_VALUE;
					for (const r of series) {
						const i = (vCC - vF) / r;
						if ((filter & Filter.Below) === 0 && i < iF - epsilon) continue;
						if ((filter & Filter.Above) === 0 && i > iF + epsilon) continue;
						const diff = Math.abs(iF - i);
						if (diff - epsilon < bestDiff) {
							bestDiff = diff;
							rApprox = r;
						}
					}
				}
				if (isNaN(rApprox)) results.push({
					label: seriesName,
					r: `(${getStr("None")})`,
					i: "",
					e: "",
					p: ""
				});
				else if (rApprox === rLast) results.push({
					label: seriesName,
					r: `(${getStr("Same as Above")})`,
					i: "",
					e: "",
					p: ""
				});
				else {
					const iApprox = (vCC - vF) / rApprox;
					const pApprox = vR * iApprox;
					const eApprox = Math.round((iApprox - iF) / iF * 1e4) / 100;
					results.push({
						label: seriesName,
						r: formatValue$1(rApprox, "", true),
						i: formatValue$1(iApprox, "", true),
						e: (eApprox > 0 ? "+" : "") + eApprox.toFixed(2),
						p: formatValue$1(pApprox, "", true)
					});
					if (Math.abs(rApprox - rIdeal) < rIdeal * 1e-6) break;
				}
				rLast = rApprox;
			}
			let rows = [[
				getStr("E Series"),
				getStr("Resistor") + " [Ω]",
				getStr("Current") + " [A]",
				getStr("Error") + " [%]",
				getStr("Power Loss") + " [W]"
			]];
			for (const res of results) rows.push([
				res.label,
				res.r,
				res.i,
				res.e,
				res.p
			]);
			const table = makeTable(rows);
			this.resultBox.appendChild(table);
		} catch (e) {
			const msg = getStr("Invalid input");
			this.resultBox.appendChild(makeP(`Error: ${msg}`));
		}
	}
};

//#endregion
//#region src/DividerFinderUi.ts
var DividerFinderUi = class extends UiPage {
	rangeSelector = null;
	numElementsInput = makeNumElementInput(MAX_COMBINATION_ELEMENTS, 4);
	topTopologySelector = makeTopologySelector();
	maxDepthInput = makeDepthSelector();
	statusBox = makeP();
	resultBox = makeDiv();
	totalMinBox = new ValueBox("10k");
	totalMaxBox = new ValueBox("100k");
	targetInput = null;
	filterSelector = new FilterBox();
	workerAgent = new WorkerAgent();
	lastResult = null;
	constructor(commonSettingsUi$1) {
		super(getStr("Voltage Divider"));
		this.commonSettingsUi = commonSettingsUi$1;
		this.rangeSelector = new ValueRangeSelector(false);
		this.targetInput = new ValueBox("3.3 / 5.0");
		this.ui = makeDiv([
			makeH2(getStr("Find Voltage Dividers")),
			makeP(`R1: ${getStr("Upper Resistor")}, R2: ${getStr("Lower Resistor")}, Vout / Vin = R2 / (R1 + R2)`),
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
					"Ω"
				],
				[
					getStr("Minimum"),
					this.rangeSelector.minResisterInput.inputBox,
					"Ω"
				],
				[
					getStr("Maximum"),
					this.rangeSelector.maxResisterInput.inputBox,
					"Ω"
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
					"R1 + R2 (min)",
					this.totalMinBox.inputBox,
					"Ω"
				],
				[
					"R1 + R2 (max)",
					this.totalMaxBox.inputBox,
					"Ω"
				],
				[
					strong("R2 / (R1 + R2)"),
					this.targetInput.inputBox,
					""
				],
				[
					getStr("Filter"),
					this.filterSelector.ui,
					""
				]
			]),
			this.statusBox,
			this.resultBox
		]);
		this.commonSettingsUi.onChanged.push(() => this.conditionChanged());
		this.rangeSelector.setOnChange(() => this.conditionChanged());
		this.numElementsInput.setOnChange(() => this.conditionChanged());
		this.topTopologySelector.addEventListener("change", () => this.conditionChanged());
		this.maxDepthInput.addEventListener("change", () => this.conditionChanged());
		this.totalMinBox.setOnChange(() => this.conditionChanged());
		this.totalMaxBox.setOnChange(() => this.conditionChanged());
		this.targetInput.setOnChange(() => this.conditionChanged());
		this.filterSelector.setOnChange(() => this.conditionChanged());
		this.workerAgent.onLaunched = (p) => this.onLaunched(p);
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
			const targetRatio = this.targetInput.value;
			const topoConstr = parseInt(this.topTopologySelector.value);
			const p = {
				useWasm: this.commonSettingsUi.useWasmCheckbox.checked,
				method: Method.FindDivider,
				capacitor: false,
				values: rangeSelector.getAvailableValues(targetRatio),
				maxElements: this.numElementsInput.value,
				topologyConstraint: topoConstr,
				maxDepth: parseInt(this.maxDepthInput.value),
				totalMin: this.totalMinBox.value,
				totalMax: this.totalMaxBox.value,
				targetRatio,
				filter: this.filterSelector.value
			};
			if (!this.workerAgent.requestStart(p)) this.showResult();
		} catch (e) {
			this.workerAgent.cancelRequest();
		}
	}
	onLaunched(p) {
		this.statusBox.style.color = "";
		this.statusBox.innerHTML = "";
		const msg = `${getStr("Searching...")} (${formatValue(p.targetRatio, "", false)}):`;
		this.statusBox.appendChild(makeIcon("⌛", true));
		this.statusBox.appendChild(document.createTextNode(" " + msg));
		this.resultBox.style.opacity = "0.5";
	}
	onFinished(e) {
		this.lastResult = e;
		this.showResult();
	}
	onAborted(msg) {
		console.log(`Aborted with message: '${msg}'`);
		this.statusBox.innerHTML = "";
		this.statusBox.style.color = msg ? "#c00" : "#000";
		if (msg) {
			this.statusBox.appendChild(makeIcon("❌"));
			this.statusBox.appendChild(document.createTextNode(getStr(msg)));
		}
		this.resultBox.innerHTML = "";
	}
	showResult() {
		this.resultBox.innerHTML = "";
		this.statusBox.innerHTML = "";
		const ret = this.lastResult;
		if (ret === null) return;
		try {
			if (ret.error && ret.error.length > 0) throw new Error(ret.error);
			const timeSpentMs = ret.timeSpent;
			let msg = getStr("No combinations found");
			if (ret.result.length > 0) msg = `${getStr("<n> combinations found", { n: ret.result.length })}`;
			msg += ` (${timeSpentMs.toFixed(2)} ms):`;
			this.statusBox.appendChild(makeIcon("✅"));
			this.statusBox.appendChild(document.createTextNode(msg));
			for (const combJson of ret.result) {
				const resultUi = new ResultUi(this.commonSettingsUi, ret.params, combJson);
				this.resultBox.appendChild(resultUi.ui);
				this.resultBox.appendChild(document.createTextNode(" "));
			}
			this.statusBox.style.color = "";
			this.resultBox.style.opacity = "";
		} catch (e) {
			let msg = "Unknown error";
			if (e.message) msg = e.message;
			this.statusBox.style.color = "#c00";
			this.statusBox.appendChild(makeIcon("❌"));
			this.statusBox.appendChild(document.createTextNode(`Error: ${getStr(msg)}`));
			this.resultBox.innerHTML = "";
		}
	}
};
var ResultUi = class {
	uppers = [];
	lowers = [];
	buttons = makeP();
	canvas = document.createElement("canvas");
	ui = makeDiv([this.buttons, this.canvas]);
	constructor(commonSettingsUi$1, params, combJson) {
		this.commonSettingsUi = commonSettingsUi$1;
		this.params = params;
		this.ui.className = "figure";
		for (const upperJson of combJson.uppers) {
			const tree = TreeNode.fromJSON(false, upperJson);
			this.uppers.push(tree);
		}
		for (const lowerJson of combJson.lowers) {
			const tree = TreeNode.fromJSON(false, lowerJson);
			this.lowers.push(tree);
		}
		this.selectUpperLower(0, 0);
	}
	selectUpperLower(iUpper, iLower) {
		const upperTree = this.uppers[iUpper];
		const lowerTree = this.lowers[iLower];
		const totalValue = upperTree.value + lowerTree.value;
		const resultRatio = lowerTree.value / totalValue;
		const targetRatio = this.params.targetRatio;
		const tree = new TreeNode(false, false, [upperTree, lowerTree], totalValue);
		lowerTree.x += 40 * SCALE;
		tree.width += 40 * SCALE;
		const PADDING = 20;
		const TOP_PADDING = 20;
		const CAPTION_HEIGHT = 80;
		const LEAD_LENGTH = 40 * SCALE;
		tree.offset(-tree.x, -tree.y);
		const VIEW_W = 500;
		const VIEW_H = 300;
		const REQ_W = tree.width + LEAD_LENGTH * 2 + PADDING * 2;
		const REQ_H = tree.height + CAPTION_HEIGHT + TOP_PADDING + PADDING * 3;
		const X_SCALE = Math.max(1, REQ_W / VIEW_W);
		const Y_SCALE = Math.max(1, REQ_H / VIEW_H);
		const SCALE$1 = Math.max(X_SCALE, Y_SCALE);
		const W = VIEW_W * SCALE$1;
		const H = VIEW_H * SCALE$1;
		const FIGURE_PLACE_W = W - PADDING * 2;
		const FIGURE_PLACE_H = H - CAPTION_HEIGHT - TOP_PADDING - PADDING * 3;
		const canvas = this.canvas;
		canvas.width = W;
		canvas.height = H;
		canvas.style.width = `${VIEW_W}px`;
		canvas.style.height = "auto";
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, W, H);
		{
			ctx.save();
			ctx.strokeStyle = "#000";
			const dx = PADDING + (FIGURE_PLACE_W - tree.width) / 2;
			const dy = PADDING + (FIGURE_PLACE_H - tree.height) / 2 + TOP_PADDING;
			ctx.translate(dx, dy);
			tree.draw(ctx, this.commonSettingsUi.showColorCodeCheckbox.checked);
			const y = tree.height / 2;
			const x0 = -LEAD_LENGTH;
			const x1 = 0;
			const x2 = tree.width;
			const x3 = tree.width + LEAD_LENGTH;
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
			const text = `R1 = ${formatValue(upperTree.value, "Ω")}, R2 = ${formatValue(lowerTree.value, "Ω")}`;
			ctx.font = `${16 * SCALE}px sans-serif`;
			ctx.fillText(text, 0, 0);
		}
		{
			const text = `R2 / (R1 + R2) = ${formatValue(resultRatio)}`;
			ctx.font = `${24 * SCALE}px sans-serif`;
			ctx.fillText(text, 0, 30);
		}
		{
			let error = (resultRatio - targetRatio) / targetRatio;
			let errorStr = getStr("No Error");
			ctx.save();
			if (Math.abs(error) > 1e-9) {
				errorStr = `${getStr("Error")}: ${error > 0 ? "+" : ""}${(error * 100).toFixed(6)}%`;
				ctx.fillStyle = error > 0 ? "#c00" : "#00c";
			}
			ctx.font = `${16 * SCALE}px sans-serif`;
			ctx.fillText(`(${errorStr})`, 0, 60);
			ctx.restore();
		}
		ctx.restore();
	}
};

//#endregion
//#region src/HomeUi.ts
var HomeUi = class extends UiPage {
	constructor() {
		super(getStr("Home"));
		this.ui = makeDiv();
	}
};

//#endregion
//#region src/main.ts
const commonSettingsUi = new CommonSettingsUi();
const homeUi = new HomeUi();
const resCombFinderUi = new CombinationFinderUi(commonSettingsUi, false);
const capCombFinderUi = new CombinationFinderUi(commonSettingsUi, true);
const currLimitFinderUi = new CurrentLimitterFinderUi();
const pages = {
	home: homeUi,
	rcmb: resCombFinderUi,
	rdiv: new DividerFinderUi(commonSettingsUi),
	rled: currLimitFinderUi,
	ccmb: capCombFinderUi
};
const menuButtons = {};
const menuBar = makeDiv([], "menuBar");
const pageContainer = makeDiv([], "pageContainer");
const defaultTitle = document.title;
let currentPageId = "";
function main(container, titleElement, followingElement) {
	titleElement.remove();
	followingElement.remove();
	homeUi.ui.appendChild(titleElement);
	homeUi.ui.appendChild(followingElement);
	for (const pageId in pages) {
		const page = pages[pageId];
		const buttonImage = document.createElement("img");
		buttonImage.src = `./img/menu_icon_${pageId}.png`;
		const menuButton = makeButton();
		menuButton.appendChild(buttonImage);
		menuButton.appendChild(makeSpan(page.title, "menuButtonLabel"));
		menuButtons[pageId] = menuButton;
		menuBar.appendChild(menuButton);
		menuBar.appendChild(document.createTextNode(" "));
		menuButton.addEventListener("click", () => {
			showPage(pageId);
		});
		window.addEventListener("hashchange", () => {
			let hash = window.location.hash;
			if (hash.startsWith("#")) hash = hash.substring(1);
			if (hash in pages) showPage(hash);
		});
	}
	container.appendChild(makeDiv([menuBar, pageContainer]));
	window.addEventListener("resize", () => {
		onResize();
	});
	onHashChange();
	onResize();
}
function showPage(pageId) {
	if (pageId && !(pageId in pages)) return;
	if (currentPageId === pageId) return;
	currentPageId = pageId;
	if (pageId === "home") {
		window.location.hash = "";
		document.title = defaultTitle;
	} else {
		window.location.hash = pageId;
		document.title = `${pages[pageId].title} | ${defaultTitle}`;
	}
	pageContainer.innerHTML = "";
	pageContainer.appendChild(pages[pageId].ui);
	for (const id in menuButtons) {
		const btn = menuButtons[id];
		if (id === pageId) btn.classList.add("menuButtonSelected");
		else btn.classList.remove("menuButtonSelected");
	}
}
function onHashChange() {
	let hash = window.location.hash;
	if (hash.startsWith("#")) hash = hash.substring(1);
	if (hash === "") hash = "home";
	if (hash in pages) showPage(hash);
}
function onResize() {
	const w = window.innerWidth;
	const labels = Array.from(document.querySelectorAll(".menuButtonLabel"));
	for (const label of labels) label.style.display = w < 1200 ? "none" : "inline";
}

//#endregion
export { main };