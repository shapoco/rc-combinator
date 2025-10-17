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
	constructor(iLeft, iRight, parallel, children) {
		this.iLeft = iLeft;
		this.iRight = iRight;
		this.parallel = parallel;
		this.children = children;
	}
	get isLeaf() {
		return this.iLeft + 1 >= this.iRight;
	}
};
const memo = /* @__PURE__ */ new Map();
function formatValue(value) {
	if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
	else if (value >= 1e3) return (value / 1e3).toFixed(2) + "k";
	else if (value >= 1) return value.toFixed(2);
	else if (value >= .001) return (value * 1e3).toFixed(2) + "m";
	else if (value >= 1e-6) return (value * 1e6).toFixed(2) + "u";
	else return value.toExponential(2);
}
var Combination = class {
	constructor(parallel = false, children = [], value = 0) {
		this.parallel = parallel;
		this.children = children;
		this.value = value;
	}
	toString(indent = "") {
		if (this.children.length === 0) return `${indent}${formatValue(this.value)} Ω\n`;
		else {
			let ret = "";
			for (const child of this.children) ret += child.toString(indent + "    ");
			ret = `${indent}${this.parallel ? "Parallel" : "Series"}: ${formatValue(this.value)} Ω\n${ret}`;
			return ret;
		}
	}
};
function findCombinations(cType, values, targetValue, maxElements) {
	let bestError = Number.POSITIVE_INFINITY;
	let bestComplexity = Number.POSITIVE_INFINITY;
	let bestCombinations = [];
	for (let numElem = 1; numElem <= maxElements; numElem++) {
		const topos = searchTopologies(0, numElem);
		const indices = new Array(numElem).fill(0);
		while (indices[numElem - 1] < values.length) {
			for (const topo of topos) {
				const value = calcValue(cType, values, indices, topo);
				if (isNaN(value)) continue;
				const complexity = calcComplexity(topo);
				const error = Math.abs(value - targetValue);
				let update = false;
				if (error < bestError || error === bestError && complexity < bestComplexity) {
					bestCombinations = [];
					update = true;
				} else if (error === bestError && complexity === bestComplexity) update = true;
				if (update) {
					bestComplexity = complexity;
					bestError = error;
					const comb = new Combination();
					calcValue(cType, values, indices, topo, comb);
					bestCombinations.push(comb);
				}
			}
			for (let i = 0; i < numElem; i++) {
				indices[i]++;
				if (indices[i] < values.length) break;
				else if (i + 1 >= numElem) break;
				else indices[i] = 0;
			}
		}
		if (bestError <= targetValue * 1e-6) break;
	}
	return bestCombinations;
}
function calcValue(cType, values, indices, topo, comb = null) {
	if (comb) comb.parallel = topo.parallel;
	if (topo.isLeaf) {
		const val$1 = values[indices[topo.iLeft]];
		if (comb) comb.value = val$1;
		return val$1;
	}
	let invSum = false;
	switch (cType) {
		case ComponentType.Resistor:
			invSum = topo.parallel;
			break;
		case ComponentType.Capacitor:
			invSum = !topo.parallel;
			break;
	}
	let ret = 0;
	let lastVal = Number.POSITIVE_INFINITY;
	for (const childTopo of topo.children) {
		const childComb = comb ? new Combination() : null;
		const childVal = calcValue(cType, values, indices, childTopo, childComb);
		if (isNaN(childVal) || childVal > lastVal) return NaN;
		lastVal = childVal;
		if (comb) comb.children.push(childComb);
		if (invSum) ret += 1 / childVal;
		else ret += childVal;
	}
	const val = invSum ? 1 / ret : ret;
	if (comb) comb.value = val;
	return val;
}
function calcComplexity(node) {
	if (node.isLeaf) return 1;
	let ret = 0;
	for (const child of node.children) ret += calcComplexity(child);
	return ret;
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
function searchTopologies(iLeft, iRight) {
	let topos = searchTopologiesRecursive(iLeft, iRight, false);
	if (iLeft + 1 < iRight) topos = topos.concat(searchTopologiesRecursive(iLeft, iRight, true));
	return topos;
}
function searchTopologiesRecursive(iLeft, iRight, parallel) {
	const key = iLeft + iRight * 1e3 + (parallel ? 1e6 : 0);
	if (memo.has(key)) return memo.get(key);
	const ret = new Array();
	if (iLeft + 1 >= iRight) {
		ret.push(new TopologyNode(iLeft, iRight, parallel, []));
		memo.set(key, ret);
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
	memo.set(key, ret);
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
	minResisterInput = new ResistorInput("最小値", "1k");
	maxResisterInput = new ResistorInput("最大値", "1M");
	container = makeSpan([
		makeLabel("シリーズ", this.seriesSelect),
		makeBr(),
		this.minResisterInput.container,
		makeBr(),
		this.maxResisterInput.container
	]);
	get availableValues() {
		const series = this.seriesSelect.value;
		const minValue = this.minResisterInput.value;
		const maxValue = this.maxResisterInput.value;
		return makeAvaiableValues(series, minValue, maxValue);
	}
	onChange(callback) {
		this.seriesSelect.addEventListener("change", () => callback());
		this.minResisterInput.onChange(callback);
		this.maxResisterInput.onChange(callback);
	}
};
var ResistorInput = class {
	RE_VALUE = /^(\d+(\.\d+)?)([kKmM]?)$/;
	inputBox = makeTextBox();
	container = makeSpan();
	constructor(label, value = null) {
		this.container.appendChild(makeLabel(label, this.inputBox, "Ω"));
		if (value) this.inputBox.value = value;
	}
	get value() {
		let text = this.inputBox.value.trim();
		if (text === "") text = this.inputBox.placeholder.trim();
		const match = this.RE_VALUE.exec(text);
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
	onChange(callback) {
		this.inputBox.addEventListener("input", () => callback());
		this.inputBox.addEventListener("change", () => callback());
	}
};
function makeBr() {
	return document.createElement("br");
}
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
function makeSpan(children = null, className = null) {
	const elm = document.createElement("span");
	toElementArray(children).forEach((child) => elm.appendChild(child));
	if (className) elm.classList.add(className);
	return elm;
}
function makeLabel(label, input, unit = null) {
	const elm = document.createElement("label");
	elm.appendChild(document.createTextNode(label + ": "));
	elm.appendChild(input);
	if (unit) elm.appendChild(document.createTextNode(" " + unit));
	return elm;
}
function makeTextBox(value = null) {
	const elm = document.createElement("input");
	elm.type = "text";
	if (value) elm.value = value;
	elm.style.width = "50px";
	return elm;
}
function makeSeriesSelector() {
	let items = [];
	for (const key of Object.keys(SERIESES)) items.push({
		value: key,
		label: key
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
	select.style.width = "50px";
	return select;
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
function main() {
	document.querySelector("#rcCombinator")?.appendChild(makeDiv([makeCombinatorUI()]));
}
function makeCombinatorUI() {
	const rangeSelector = new ResistorRangeSelector();
	const targetInput = new ResistorInput("目標値", "50k");
	const numElementsInput = makeTextBox("3");
	const resultBox = document.createElement("pre");
	const ui = makeDiv([
		makeH2("合成抵抗計算機"),
		makeParagraph([
			rangeSelector.container,
			makeBr(),
			targetInput.container,
			makeBr(),
			makeLabel("最大素子数", numElementsInput)
		]),
		resultBox
	]);
	const callback = () => {
		try {
			const availableValues = rangeSelector.availableValues;
			const targetValue = targetInput.value;
			const maxElements = parseInt(numElementsInput.value, 10);
			if (Math.pow(availableValues.length, maxElements) > 1e6) throw new Error("Too many value combinations.");
			const combs = findCombinations(ComponentType.Resistor, availableValues, targetValue, maxElements);
			let resultText = "";
			if (combs.length > 0) {
				resultText += `Found ${combs.length} combination(s):\n\n`;
				for (const comb of combs) resultText += comb.toString() + "\n";
			} else resultText = "No combinations found.";
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

//#endregion
//#region src/index.ts
main();

//#endregion
export {  };