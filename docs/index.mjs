//#region src/Text.ts
const texts = { "ja": {
	"Find Resistor Combinations": "合成抵抗を見つける",
	"Find Voltage Dividers": "分圧抵抗を見つける",
	"E Series": "シリーズ",
	"Item": "項目",
	"Value": "値",
	"Unit": "単位",
	"Minimum": "最小値",
	"Maximum": "最大値",
	"Custom": "カスタム",
	"Custom Values": "カスタム値",
	"Max Elements": "最大素子数",
	"Target Value": "目標値",
	"The search space is too large.": "探索空間が大きすぎます。",
	"Upper Resistor": "上側の抵抗",
	"Lower Resistor": "下側の抵抗",
	"No combinations found.": "組み合わせが見つかりませんでした。",
	"Found <n> combination(s):": "<n> 件の組み合わせが見つかりました。",
	"Parallel": "並列",
	"Series": "直列"
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
//#region src/RcComb.ts
const SERIESES = {
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
let ComponentType = /* @__PURE__ */ function(ComponentType$1) {
	ComponentType$1[ComponentType$1["Resistor"] = 0] = "Resistor";
	ComponentType$1[ComponentType$1["Capacitor"] = 1] = "Capacitor";
	return ComponentType$1;
}({});
var TopologyNode = class {
	complexity_ = -1;
	constructor(iLeft, iRight, parallel, children) {
		this.iLeft = iLeft;
		this.iRight = iRight;
		this.parallel = parallel;
		this.children = children;
	}
	get isLeaf() {
		return this.iLeft + 1 >= this.iRight;
	}
	get complexity() {
		if (this.complexity_ < 0) if (this.isLeaf) this.complexity_ = 1;
		else {
			this.complexity_ = 0;
			for (const child of this.children) this.complexity_ += child.complexity;
		}
		return this.complexity_;
	}
};
const RE_VALUE = /^(\d+(\.\d+)?)([kKmM]?)$/;
const topologyMemo = /* @__PURE__ */ new Map();
function formatValue(value, unit) {
	if (value >= 1e9) return (value / 1e9).toFixed(3) + " G" + unit;
	else if (value >= 1e6) return (value / 1e6).toFixed(3) + " M" + unit;
	else if (value >= 1e3) return (value / 1e3).toFixed(3) + " k" + unit;
	else if (value >= 1) return value.toFixed(3) + " " + unit;
	else if (value >= .001) return (value * 1e3).toFixed(3) + " m" + unit;
	else if (value >= 1e-6) return (value * 1e6).toFixed(3) + " u" + unit;
	else if (value >= 1e-9) return (value * 1e9).toFixed(3) + " n" + unit;
	else if (value >= 1e-12) return (value * 0xe8d4a51000).toFixed(3) + " p" + unit;
	else return value.toExponential(3) + " " + unit;
}
function parseValue(text) {
	const match = RE_VALUE.exec(text);
	if (!match) throw new Error(`Invalid resistor value: ${text}`);
	let value = parseFloat(match[1]);
	switch (match[3]) {
		case "n":
			value *= 1e-9;
			break;
		case "u":
			value *= 1e-6;
			break;
		case "m":
			value *= .001;
			break;
		case "k":
		case "K":
			value *= 1e3;
			break;
		case "M":
			value *= 1e6;
			break;
		case "G":
			value *= 1e9;
			break;
		case "T":
			value *= 0xe8d4a51000;
			break;
	}
	return value;
}
var Combination = class {
	constructor(parallel = false, children = [], value = 0, complexity = -1) {
		this.parallel = parallel;
		this.children = children;
		this.value = value;
		this.complexity = complexity;
	}
	toString(indent = "") {
		if (this.children.length === 0) return `${indent}${formatValue(this.value, "Ω")}\n`;
		else {
			let ret = "";
			for (const child of this.children) ret += child.toString(indent + "    ");
			ret = `${indent}${this.parallel ? getStr("Parallel") : getStr("Series")}: ${formatValue(this.value, "Ω")}\n${ret}`;
			return ret;
		}
	}
};
var DividerCombination = class {
	constructor(upper, lower, ratio) {
		this.upper = upper;
		this.lower = lower;
		this.ratio = ratio;
	}
	toString() {
		const up = this.upper[0];
		const lo = this.lower[0];
		let ret = `R2 / (R1 + R2) = ${this.ratio.toFixed(6)}\nR1 + R2 = ${formatValue(up.value + lo.value, "Ω")}\n`;
		ret += "  R1:\n";
		ret += up.toString("    ");
		ret += "  R2:\n";
		ret += lo.toString("    ");
		return ret;
	}
};
function findCombinations(cType, values, targetValue, maxElements) {
	const epsilon = targetValue * 1e-6;
	const numComb = Math.pow(values.length, maxElements);
	if (maxElements > 10 || numComb > 1e6) throw new Error(getStr("The search space is too large."));
	let bestError = Number.POSITIVE_INFINITY;
	let bestCombinations = [];
	for (let numElem = 1; numElem <= maxElements; numElem++) {
		const topos = searchTopologies(0, numElem);
		const indices = new Array(numElem).fill(0);
		while (indices[numElem - 1] < values.length) {
			for (const topo of topos) {
				const value = calcValue(cType, values, indices, topo);
				if (isNaN(value)) continue;
				const error = Math.abs(value - targetValue);
				let update = false;
				if (error < bestError - epsilon) {
					bestCombinations = [];
					update = true;
				}
				if (update) {
					bestError = error;
					const comb = new Combination();
					calcValue(cType, values, indices, topo, comb);
					bestCombinations.push(comb);
				}
			}
			incrementIndices(indices, values);
		}
		if (bestError <= epsilon) break;
	}
	return selectSimplestCombinations(bestCombinations);
}
function findDividers(cType, values, targetRatio, totalMin, totalMax, maxElements) {
	const epsilon = 1e-6;
	const numComb = Math.pow(values.length, 2 * maxElements);
	if (maxElements > 10 || numComb > 1e7) throw new Error(getStr("The search space is too large."));
	let bestError = Number.POSITIVE_INFINITY;
	let bestCombinations = [];
	const combMemo = /* @__PURE__ */ new Map();
	for (let numElem = 1; numElem <= maxElements; numElem++) {
		const topos = searchTopologies(0, numElem);
		const indices = new Array(numElem).fill(0);
		while (indices[numElem - 1] < values.length) {
			for (const topo of topos) {
				const lowerValue = calcValue(cType, values, indices, topo);
				if (isNaN(lowerValue)) continue;
				const totalTargetValue = lowerValue / targetRatio;
				const upperTargetValue = totalTargetValue - lowerValue;
				if (totalTargetValue < totalMin || totalMax < totalTargetValue) continue;
				if (lowerValue in combMemo) {
					const lowerComb$1 = new Combination();
					calcValue(cType, values, indices, topo, lowerComb$1);
					combMemo.get(lowerValue)?.lower.push(lowerComb$1);
					continue;
				}
				const upperCombs = findCombinations(cType, values, upperTargetValue, maxElements);
				if (upperCombs.length === 0) continue;
				const ratio = lowerValue / (upperCombs[0].value + lowerValue);
				const error = Math.abs(ratio - targetRatio);
				if (error > bestError + epsilon) continue;
				if (error < bestError - epsilon) {
					console.log(`New best error: ${error}`);
					bestCombinations = [];
				}
				bestError = error;
				const lowerComb = new Combination();
				calcValue(cType, values, indices, topo, lowerComb);
				const dividerComb = new DividerCombination(upperCombs, [lowerComb], ratio);
				bestCombinations.push(dividerComb);
				combMemo.set(lowerValue, dividerComb);
			}
			incrementIndices(indices, values);
		}
		if (bestError <= epsilon) break;
	}
	for (const comb of bestCombinations) {
		comb.upper = selectSimplestCombinations(comb.upper);
		comb.lower = selectSimplestCombinations(comb.lower);
	}
	return bestCombinations;
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
function calcValue(cType, values, indices, topo, comb = null) {
	if (comb) {
		comb.parallel = topo.parallel;
		comb.complexity = topo.complexity;
	}
	if (topo.isLeaf) {
		const val$1 = values[indices[topo.iLeft]];
		if (comb) comb.value = val$1;
		return val$1;
	}
	let invSum = false;
	if (cType === ComponentType.Resistor) invSum = topo.parallel;
	else invSum = !topo.parallel;
	let ret = 0;
	let lastLeafVal = Number.POSITIVE_INFINITY;
	let lastCombVal = Number.POSITIVE_INFINITY;
	for (const childTopo of topo.children) {
		const childComb = comb ? new Combination() : null;
		const childVal = calcValue(cType, values, indices, childTopo, childComb);
		if (isNaN(childVal)) return NaN;
		if (childTopo.isLeaf) {
			if (childVal > lastLeafVal) return NaN;
			lastLeafVal = childVal;
		} else {
			if (childVal > lastCombVal) return NaN;
			lastCombVal = childVal;
		}
		if (comb) comb.children.push(childComb);
		if (invSum) ret += 1 / childVal;
		else ret += childVal;
	}
	const val = invSum ? 1 / ret : ret;
	if (comb) comb.value = val;
	return val;
}
function makeAvaiableValues(series, minValue, maxValue) {
	const baseValues = SERIESES[series];
	if (!baseValues) throw new Error(`Unknown series: ${series}`);
	const values = [];
	for (let exp = -9; exp <= 12; exp++) {
		const multiplier = Math.pow(10, exp);
		for (const base of baseValues) {
			const value = base * multiplier;
			if (value >= minValue && value <= maxValue) values.push(value);
		}
	}
	values.sort((a, b) => a - b);
	return values;
}
function selectSimplestCombinations(combs) {
	let bestComplexity = Number.POSITIVE_INFINITY;
	for (const comb of combs) if (comb.complexity < bestComplexity) bestComplexity = comb.complexity;
	return combs.filter((comb) => comb.complexity === bestComplexity);
}
function searchTopologies(iLeft, iRight) {
	let topos = searchTopologiesRecursive(iLeft, iRight, false);
	if (iLeft + 1 < iRight) topos = topos.concat(searchTopologiesRecursive(iLeft, iRight, true));
	return topos;
}
function searchTopologiesRecursive(iLeft, iRight, parallel) {
	const key = iLeft + iRight * 1e3 + (parallel ? 1e6 : 0);
	if (topologyMemo.has(key)) return topologyMemo.get(key);
	const ret = new Array();
	if (iLeft + 1 >= iRight) {
		ret.push(new TopologyNode(iLeft, iRight, parallel, []));
		topologyMemo.set(key, ret);
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
			ret.push(new TopologyNode(iLeft, iRight, parallel, childNodes));
			for (let i = 0; i < numParts; i++) {
				indices[i]++;
				if (indices[i] < parts[i].length) break;
				else if (i + 1 >= numParts) break;
				else indices[i] = 0;
			}
		}
	}, 0);
	topologyMemo.set(key, ret);
	return ret;
}
function divideElementsRecursive(buff, buffSize, numElems, callback, depth) {
	if (numElems === 0) callback(buff, buffSize);
	else {
		let wMax = buffSize == 0 ? numElems - 1 : numElems;
		if (buffSize > 0 && buff[buffSize - 1] < wMax) wMax = buff[buffSize - 1];
		for (let w = 1; w <= wMax; w++) {
			buff[buffSize] = w;
			divideElementsRecursive(buff, buffSize + 1, numElems - w, callback, depth + 1);
		}
	}
}

//#endregion
//#region src/Ui.ts
var ResistorRangeSelector = class {
	seriesSelect = makeSeriesSelector();
	customValuesInput = document.createElement("textarea");
	minResisterInput = new ResistorInput("100");
	maxResisterInput = new ResistorInput("1M");
	constructor() {
		this.customValuesInput.value = "100, 1k, 10k";
		this.customValuesInput.placeholder = "e.g.\n100, 1k, 10k";
		this.customValuesInput.disabled = true;
	}
	get availableValues() {
		const series = this.seriesSelect.value;
		if (series === "custom") {
			const valueStrs = this.customValuesInput.value.split(",");
			const values = [];
			for (let str of valueStrs) {
				str = str.trim();
				if (str === "") continue;
				const val = parseValue(str);
				if (!isNaN(val) && !values.includes(val)) values.push(val);
			}
			return values;
		} else {
			const minValue = this.minResisterInput.value;
			const maxValue = this.maxResisterInput.value;
			return makeAvaiableValues(series, minValue, maxValue);
		}
	}
	onChange(callback) {
		this.seriesSelect.addEventListener("change", () => {
			const custom = this.seriesSelect.value === "custom";
			this.customValuesInput.disabled = !custom;
			this.minResisterInput.inputBox.disabled = custom;
			this.maxResisterInput.inputBox.disabled = custom;
			callback();
		});
		this.customValuesInput.addEventListener("input", () => callback());
		this.customValuesInput.addEventListener("change", () => callback());
		this.minResisterInput.onChange(callback);
		this.maxResisterInput.onChange(callback);
	}
};
var ResistorInput = class {
	inputBox = makeTextBox();
	constructor(value = null) {
		if (value) this.inputBox.value = value;
	}
	get value() {
		let text = this.inputBox.value.trim();
		if (text === "") text = this.inputBox.placeholder.trim();
		return parseValue(text);
	}
	onChange(callback) {
		this.inputBox.addEventListener("input", () => callback());
		this.inputBox.addEventListener("change", () => callback());
	}
};
function makeH2(label) {
	const elm = document.createElement("h2");
	elm.textContent = label;
	return elm;
}
function makeDiv(children, className = null, center = false) {
	const elm = document.createElement("div");
	toElementArray(children).forEach((child) => elm.appendChild(child));
	if (className) elm.classList.add(className);
	if (center) elm.style.textAlign = "center";
	return elm;
}
function makeParagraph(children, className = null, center = false) {
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
function makeTextBox(value = null) {
	const elm = document.createElement("input");
	elm.type = "text";
	if (value) elm.value = value;
	return elm;
}
function makeSeriesSelector() {
	let items = [];
	for (const key of Object.keys(SERIESES)) items.push({
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

//#endregion
//#region src/main.ts
function main() {
	document.querySelector("#rcCombinator")?.appendChild(makeDiv([makeCombinatorUI(), makeDividerCombinatorUI()]));
}
function makeCombinatorUI() {
	const rangeSelector = new ResistorRangeSelector();
	const targetInput = new ResistorInput("5.1k");
	const numElementsInput = makeTextBox("4");
	const resultBox = document.createElement("pre");
	const ui = makeDiv([
		makeH2(getStr("Find Resistor Combinations")),
		makeTable([
			[
				getStr("Item"),
				getStr("Value"),
				getStr("Unit")
			],
			[
				getStr("E Series"),
				rangeSelector.seriesSelect,
				""
			],
			[
				getStr("Custom Values"),
				rangeSelector.customValuesInput,
				"Ω"
			],
			[
				getStr("Minimum"),
				rangeSelector.minResisterInput.inputBox,
				"Ω"
			],
			[
				getStr("Maximum"),
				rangeSelector.maxResisterInput.inputBox,
				"Ω"
			],
			[
				getStr("Max Elements"),
				numElementsInput,
				""
			],
			[
				getStr("Target Value"),
				targetInput.inputBox,
				"Ω"
			]
		]),
		resultBox
	]);
	const callback = () => {
		try {
			const custom = rangeSelector.seriesSelect.value === "custom";
			setVisible(parentTrOf(rangeSelector.customValuesInput), custom);
			setVisible(parentTrOf(rangeSelector.minResisterInput.inputBox), !custom);
			setVisible(parentTrOf(rangeSelector.maxResisterInput.inputBox), !custom);
			const availableValues = rangeSelector.availableValues;
			const targetValue = targetInput.value;
			const maxElements = parseInt(numElementsInput.value, 10);
			const combs = findCombinations(ComponentType.Resistor, availableValues, targetValue, maxElements);
			let resultText = "";
			if (combs.length > 0) {
				resultText += getStr("Found <n> combination(s):", { n: combs.length }) + "\n\n";
				for (const comb of combs) resultText += comb.toString() + "\n";
			} else resultText = getStr("No combinations found.");
			resultBox.textContent = resultText;
		} catch (e) {
			resultBox.textContent = `Error: ${e.message}`;
		}
	};
	rangeSelector.onChange(callback);
	targetInput.onChange(callback);
	numElementsInput.addEventListener("change", () => callback());
	numElementsInput.addEventListener("input", () => callback());
	callback();
	return ui;
}
function makeDividerCombinatorUI() {
	const rangeSelector = new ResistorRangeSelector();
	const targetInput = makeTextBox("0.3");
	const totalMinBox = new ResistorInput("10k");
	const totalMaxBox = new ResistorInput("100k");
	const numElementsInput = makeTextBox("2");
	const resultBox = document.createElement("pre");
	const ui = makeDiv([
		makeH2(getStr("Find Voltage Dividers")),
		makeParagraph(`R1: ${getStr("Upper Resistor")}, R2: ${getStr("Lower Resistor")}`),
		makeTable([
			[
				getStr("Item"),
				getStr("Value"),
				getStr("Unit")
			],
			[
				getStr("E Series"),
				rangeSelector.seriesSelect,
				""
			],
			[
				getStr("Custom Values"),
				rangeSelector.customValuesInput,
				"Ω"
			],
			[
				getStr("Minimum"),
				rangeSelector.minResisterInput.inputBox,
				"Ω"
			],
			[
				getStr("Maximum"),
				rangeSelector.maxResisterInput.inputBox,
				"Ω"
			],
			[
				getStr("Max Elements"),
				numElementsInput,
				""
			],
			[
				"R1 + R2 (min)",
				totalMinBox.inputBox,
				"Ω"
			],
			[
				"R1 + R2 (max)",
				totalMaxBox.inputBox,
				"Ω"
			],
			[
				"R2 / (R1 + R2)",
				targetInput,
				""
			]
		]),
		resultBox
	]);
	const callback = () => {
		try {
			const custom = rangeSelector.seriesSelect.value === "custom";
			setVisible(parentTrOf(rangeSelector.customValuesInput), custom);
			setVisible(parentTrOf(rangeSelector.minResisterInput.inputBox), !custom);
			setVisible(parentTrOf(rangeSelector.maxResisterInput.inputBox), !custom);
			const availableValues = rangeSelector.availableValues;
			const targetValue = parseFloat(targetInput.value);
			const totalMin = totalMinBox.value;
			const totalMax = totalMaxBox.value;
			const maxElements = parseInt(numElementsInput.value, 10);
			const combs = findDividers(ComponentType.Resistor, availableValues, targetValue, totalMin, totalMax, maxElements);
			let resultText = "";
			if (combs.length > 0) {
				resultText += getStr("Found <n> combination(s):", { n: combs.length }) + "\n\n";
				for (const comb of combs) resultText += comb.toString() + "\n";
			} else resultText = getStr("No combinations found.");
			resultBox.textContent = resultText;
		} catch (e) {
			resultBox.textContent = `Error: ${e.message}`;
		}
	};
	rangeSelector.onChange(callback);
	targetInput.addEventListener("change", () => callback());
	targetInput.addEventListener("input", () => callback());
	numElementsInput.addEventListener("change", () => callback());
	numElementsInput.addEventListener("input", () => callback());
	totalMinBox.onChange(callback);
	totalMaxBox.onChange(callback);
	callback();
	return ui;
}

//#endregion
//#region src/index.ts
main();

//#endregion
export {  };