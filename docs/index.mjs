//#region src/Svg.ts
var State = class State {
	x = 0;
	y = 0;
	backColor = "white";
	foreColor = "black";
	textColor = "black";
	fontSize = 12;
	clone() {
		const state = new State();
		state.x = this.x;
		state.y = this.y;
		state.backColor = this.backColor;
		state.foreColor = this.foreColor;
		state.textColor = this.textColor;
		state.fontSize = this.fontSize;
		return state;
	}
};
var SvgCanvas = class {
	svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	xMin = 0;
	yMin = 0;
	xMax = 1;
	yMax = 1;
	stack = [new State()];
	constructor() {
		this.svg.setAttribute("viewBox", "0 0 100 100");
	}
	get state() {
		return this.stack[this.stack.length - 1];
	}
	pushState() {
		this.stack.push(this.state.clone());
	}
	popState() {
		if (this.stack.length > 1) this.stack.pop();
		else throw new Error("State stack underflow");
	}
	offsetState(dx, dy) {
		this.state.x += dx;
		this.state.y += dy;
	}
	setBackColor(color = "transparent") {
		this.state.backColor = color;
	}
	setForeColor(color = "black") {
		this.state.foreColor = color;
	}
	setTextColor(color = "black") {
		this.state.textColor = color;
	}
	setFontSize(size) {
		this.state.fontSize = size;
	}
	drawFillRect(x, y, w, h) {
		x += this.state.x;
		y += this.state.y;
		const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		rect.setAttribute("x", x.toString());
		rect.setAttribute("y", y.toString());
		rect.setAttribute("width", w.toString());
		rect.setAttribute("height", h.toString());
		if (this.state.backColor !== "transparent") rect.setAttribute("fill", this.state.backColor);
		if (this.state.foreColor !== "transparent") rect.setAttribute("stroke", this.state.foreColor);
		this.svg.appendChild(rect);
		this.xMin = Math.min(this.xMin, x);
		this.yMin = Math.min(this.yMin, y);
		this.xMax = Math.max(this.xMax, x + w);
		this.yMax = Math.max(this.yMax, y + h);
	}
	drawLine(x1, y1, x2, y2) {
		x1 += this.state.x;
		y1 += this.state.y;
		x2 += this.state.x;
		y2 += this.state.y;
		const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		line.setAttribute("x1", x1.toString());
		line.setAttribute("y1", y1.toString());
		line.setAttribute("x2", x2.toString());
		line.setAttribute("y2", y2.toString());
		line.setAttribute("stroke", this.state.foreColor);
		this.svg.appendChild(line);
		this.xMin = Math.min(this.xMin, x1);
		this.yMin = Math.min(this.yMin, y1);
		this.xMax = Math.max(this.xMax, x2);
		this.yMax = Math.max(this.yMax, y2);
	}
	drawText(x, y, text) {
		x += this.state.x;
		y += this.state.y;
		const textElem = document.createElementNS("http://www.w3.org/2000/svg", "text");
		textElem.setAttribute("x", x.toString());
		textElem.setAttribute("y", y.toString());
		textElem.setAttribute("fill", this.state.textColor);
		textElem.setAttribute("font-size", this.state.fontSize.toString());
		textElem.setAttribute("font-family", "Arial, sans-serif");
		textElem.setAttribute("text-anchor", "middle");
		textElem.textContent = text;
		this.svg.appendChild(textElem);
		const w = text.length * (this.state.fontSize * .6);
		this.xMin = Math.min(this.xMin, x - w / 2);
		this.yMin = Math.min(this.yMin, y - this.state.fontSize);
		this.xMax = Math.max(this.xMax, x + w / 2);
		this.yMax = Math.max(this.yMax, y);
	}
	build() {
		const x = this.xMin - 10;
		const y = this.yMin - 10;
		const w = this.xMax - this.xMin + 20;
		const h = this.yMax - this.yMin + 20;
		this.svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
		return this.svg;
	}
};

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
	"Found <n> combination(s):": "<n> 件の組み合わせが見つかりました。",
	"Parallel": "並列",
	"Series": "直列",
	"Ideal Value": "理想値",
	"<s> Approximation": "<s> 近似",
	"Error": "誤差",
	"No Error": "誤差なし"
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
let ComponentType = /* @__PURE__ */ function(ComponentType$1) {
	ComponentType$1[ComponentType$1["Resistor"] = 0] = "Resistor";
	ComponentType$1[ComponentType$1["Capacitor"] = 1] = "Capacitor";
	return ComponentType$1;
}({});
var TopologyNode = class {
	complexity_ = -1;
	hash = -1;
	constructor(iLeft, iRight, parallel, children) {
		this.iLeft = iLeft;
		this.iRight = iRight;
		this.parallel = parallel;
		this.children = children;
		if (children.length === 0) this.hash = 1;
		else {
			const POLY = 2149580803;
			let lfsr = parallel ? 2863311530 : 1431655765;
			for (const child of children) {
				lfsr ^= child.hash;
				const msb = (lfsr & 2147483648) !== 0;
				lfsr = (lfsr & 2147483647) << 1;
				if (msb) lfsr ^= POLY;
			}
			this.hash = lfsr;
		}
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
const topologyMemo = /* @__PURE__ */ new Map();
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
const FIGURE_SCALE = 10;
var Combination = class {
	cType = ComponentType.Resistor;
	parallel = false;
	children = [];
	value = 0;
	complexity = -1;
	x = 0;
	y = 0;
	width = 0;
	height = 0;
	constructor() {}
	get isLeaf() {
		return this.children.length === 0;
	}
	get unit() {
		switch (this.cType) {
			case ComponentType.Resistor: return "Ω";
			case ComponentType.Capacitor: return "F";
			default: return "";
		}
	}
	layout() {
		let maxChildWidth = 0;
		let maxChildHeight = 0;
		for (const child of this.children) {
			child.layout();
			maxChildWidth = Math.max(maxChildWidth, child.width);
			maxChildHeight = Math.max(maxChildHeight, child.height);
		}
		if (this.isLeaf) {
			this.width = FIGURE_SCALE * 2;
			this.height = FIGURE_SCALE * 2;
		} else if (this.parallel) {
			let y = 0;
			this.width = maxChildWidth + FIGURE_SCALE * 2;
			for (const child of this.children) {
				child.x = (this.width - child.width) / 2;
				child.y = y;
				y += child.height + FIGURE_SCALE;
			}
			this.height = y - FIGURE_SCALE;
		} else {
			let x = 0;
			this.height = maxChildHeight + FIGURE_SCALE * 2;
			for (const child of this.children) {
				child.x = x;
				child.y = (this.height - child.height) / 2;
				x += child.width + FIGURE_SCALE * 1.5;
			}
			this.width = x - FIGURE_SCALE * 1.5;
		}
	}
	paint(svg) {
		svg.pushState();
		svg.offsetState(this.x, this.y);
		if (this.isLeaf) if (this.cType === ComponentType.Resistor) {
			const h = this.height / 3;
			const y = (this.height - h) / 2;
			svg.setBackColor("white");
			svg.drawFillRect(0, y, this.width, h);
			svg.setFontSize(9);
			svg.drawText(this.width / 2, y - FIGURE_SCALE / 4, formatValue(this.value, this.unit));
		} else {
			const w = this.width / 3;
			const h = this.height * 2 / 3;
			const x0 = this.width / 2 - w / 2;
			const x1 = this.width / 2 + w / 2;
			const y = (this.height - h) / 2;
			svg.setForeColor("transparent");
			svg.drawFillRect(x0, y, w, h);
			svg.setForeColor("black");
			svg.drawLine(x0, y, x0, y + h);
			svg.drawLine(x1, y, x1, y + h);
			svg.setFontSize(9);
			svg.drawText(this.width / 2, y - FIGURE_SCALE / 3, formatValue(this.value, this.unit));
		}
		else if (this.parallel) {
			svg.setForeColor("transparent");
			svg.drawFillRect(0, 0, this.width, this.height);
			svg.setForeColor("black");
			let y0 = -1;
			let y1 = this.height;
			for (const child of this.children) {
				const y = child.y + child.height / 2;
				svg.drawLine(0, y, this.width, y);
				if (y0 < 0) y0 = y;
				y1 = y;
			}
			svg.drawLine(0, y0, 0, y1);
			svg.drawLine(this.width, y0, this.width, y1);
		}
		for (const child of this.children) child.paint(svg);
		svg.popState();
	}
	generateSvg(target) {
		const canvas = new SvgCanvas();
		this.layout();
		{
			const x0 = this.x - 20;
			const x1 = x0 + this.width + 40;
			const y = this.y + this.height / 2;
			canvas.drawLine(x0, y, x1, y);
		}
		this.paint(canvas);
		{
			const x = this.x + this.width / 2;
			const y = this.y + this.height + 12;
			canvas.setFontSize(12);
			canvas.drawText(x, y, formatValue(this.value, this.unit));
			canvas.setFontSize(9);
			const error = (this.value - target) / target;
			let errorText = `(${getStr("No Error")})`;
			if (Math.abs(error) > 1e-6) errorText = `(${getStr("Error")}: ${error > 0 ? "+" : ""}${(error * 100).toFixed(3)}%)`;
			canvas.drawText(x, y + 15, errorText);
		}
		const img = new Image();
		img.src = "data:image/svg+xml;base64," + bytesToBase64(new XMLSerializer().serializeToString(canvas.build()));
		img.style.backgroundColor = "white";
		img.style.border = "1px solid black";
		img.style.width = "300px";
		img.style.height = "300px";
		return img;
	}
	toString(indent = "") {
		if (this.isLeaf) return `${indent}${formatValue(this.value, this.unit)}\n`;
		else {
			let ret = "";
			for (const child of this.children) ret += child.toString(indent + "    ");
			ret = `${indent}${getStr(this.parallel ? "Parallel" : "Series")} (${formatValue(this.value, this.unit)}):\n${ret}`;
			return ret;
		}
	}
	toJson() {
		if (this.isLeaf) return this.value;
		else return {
			parallel: this.parallel,
			children: this.children.map((child) => child.toJson())
		};
	}
};
var DividerCombination = class {
	x = 0;
	y = 0;
	width = 0;
	height = 0;
	constructor(upper, lower, ratio) {
		this.upper = upper;
		this.lower = lower;
		this.ratio = ratio;
	}
	toString() {
		const up = this.upper[0];
		const lo = this.lower[0];
		let ret = `R2 / (R1 + R2) = ${this.ratio.toFixed(6)}\nR1 + R2 = ${formatValue(up.value + lo.value, "Ω")}\n`;
		ret += "R1:\n";
		ret += up.toString("    ");
		ret += "R2:\n";
		ret += lo.toString("    ");
		return ret;
	}
	layout() {
		const upper = this.upper[0];
		const lower = this.lower[0];
		upper.layout();
		lower.layout();
		const padding = FIGURE_SCALE * 4;
		this.width = upper.width + lower.width + padding;
		this.height = Math.max(upper.height, lower.height);
		lower.x += upper.width + padding;
		upper.y += (this.height - upper.height) / 2;
		lower.y += (this.height - lower.height) / 2;
	}
	generateSvg(target) {
		const upper = this.upper[0];
		const lower = this.lower[0];
		const canvas = new SvgCanvas();
		this.layout();
		{
			const x0 = this.x - 20;
			const x1 = x0 + this.width + 40;
			const y = this.y + this.height / 2;
			canvas.drawLine(x0, y, x1, y);
		}
		upper.paint(canvas);
		{
			const x = upper.x + upper.width / 2;
			const y = this.y + this.height + 9;
			canvas.setFontSize(9);
			canvas.drawText(x, y, "R1 = " + formatValue(upper.value, upper.unit));
		}
		lower.paint(canvas);
		{
			const x = lower.x + lower.width / 2;
			const y = this.y + this.height + 9;
			canvas.setFontSize(9);
			canvas.drawText(x, y, "R2 = " + formatValue(lower.value, lower.unit));
		}
		{
			const x = this.x + this.width / 2;
			const y = this.y + this.height + 32;
			canvas.setFontSize(12);
			canvas.drawText(x, y, "R2 / (R1 + R2) = " + formatValue(this.ratio, ""));
			canvas.setFontSize(9);
			const error = (this.ratio - target) / target;
			let errorText = `(${getStr("No Error")})`;
			if (Math.abs(error) > 1e-6) errorText = `(${getStr("Error")}: ${error > 0 ? "+" : ""}${(error * 100).toFixed(3)}%)`;
			canvas.drawText(x, y + 15, errorText);
		}
		const img = new Image();
		img.src = "data:image/svg+xml;base64," + bytesToBase64(new XMLSerializer().serializeToString(canvas.build()));
		img.style.backgroundColor = "white";
		img.style.border = "1px solid black";
		img.style.width = "400px";
		img.style.height = "200px";
		return img;
	}
};
function findCombinations(cType, values, targetValue, maxElements) {
	const epsilon = targetValue * 1e-9;
	const retMin = targetValue / 2;
	const retMax = targetValue * 2;
	const numComb = Math.pow(values.length, maxElements);
	if (maxElements > 10 || numComb > 1e6) throw new Error(getStr("The search space is too large."));
	let bestError = Number.POSITIVE_INFINITY;
	let bestCombinations = [];
	for (let numElem = 1; numElem <= maxElements; numElem++) {
		const topos = searchTopologies(0, numElem);
		const indices = new Array(numElem).fill(0);
		while (indices[numElem - 1] < values.length) {
			for (const topo of topos) {
				const value = calcValue(cType, values, indices, topo, null, retMin, retMax);
				if (isNaN(value)) continue;
				const error = Math.abs(value - targetValue);
				if (error - epsilon > bestError) continue;
				if (error + epsilon < bestError) bestCombinations = [];
				bestError = error;
				const comb = new Combination();
				calcValue(cType, values, indices, topo, comb);
				bestCombinations.push(comb);
			}
			incrementIndices(indices, values);
		}
		if (bestError <= epsilon) break;
	}
	return selectSimplestCombinations(bestCombinations);
}
function findDividers(cType, values, targetRatio, totalMin, totalMax, maxElements) {
	const epsilon = 1e-9;
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
				const lowerValue = calcValue(cType, values, indices, topo, null, 0, totalMax);
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
				if (error - epsilon > bestError) continue;
				if (error + epsilon < bestError) bestCombinations = [];
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
function calcValue(cType, values, indices, topo, comb = null, min = 0, max = Number.POSITIVE_INFINITY) {
	if (comb) {
		comb.cType = cType;
		comb.parallel = topo.parallel;
		comb.complexity = topo.complexity;
	}
	if (topo.isLeaf) {
		const val$1 = values[indices[topo.iLeft]];
		if (val$1 < min || max < val$1) return NaN;
		if (comb) comb.value = val$1;
		return val$1;
	}
	let invSum = false;
	if (cType === ComponentType.Resistor) invSum = topo.parallel;
	else invSum = !topo.parallel;
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
		const childVal = calcValue(cType, values, indices, childTopo, childComb, childMin, childMax);
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
function makeAvaiableValues(series, minValue = 1e-12, maxValue = 0xe8d4a51000) {
	const baseValues = SERIESES[series];
	if (!baseValues) throw new Error(`Unknown series: ${series}`);
	const values = [];
	for (let exp = -11; exp <= 15; exp++) {
		const multiplier = pow10(exp - 3);
		for (const base of baseValues) {
			const value = base * multiplier;
			const epsilon = value / 1e6;
			if (minValue - epsilon < value && value < maxValue + epsilon) values.push(value);
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
		let wMax = numElems;
		if (buffSize == 0) wMax = numElems - 1;
		else if (buffSize > 0 && buff[buffSize - 1] < wMax) wMax = buff[buffSize - 1];
		for (let w = 1; w <= wMax; w++) {
			buff[buffSize] = w;
			divideElementsRecursive(buff, buffSize + 1, numElems - w, callback, depth + 1);
		}
	}
}
function bytesToBase64(s) {
	const bytes = new TextEncoder().encode(s);
	const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
	return btoa(binString);
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

//#endregion
//#region src/Ui.ts
var ValueRangeSelector = class {
	seriesSelect = makeSeriesSelector();
	customValuesInput = document.createElement("textarea");
	minResisterInput = new ValueBox();
	maxResisterInput = new ValueBox();
	constructor(cType) {
		this.cType = cType;
		if (cType === ComponentType.Resistor) {
			this.customValuesInput.value = "100, 1k, 10k";
			this.customValuesInput.placeholder = "e.g.\n100, 1k, 10k";
			this.minResisterInput.inputBox.value = "100";
			this.maxResisterInput.inputBox.value = "1M";
		} else {
			this.customValuesInput.value = "1n, 10n, 100n";
			this.customValuesInput.placeholder = "e.g.\n1n, 10n, 100n";
			this.minResisterInput.inputBox.value = "100p";
			this.maxResisterInput.inputBox.value = "100u";
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
function makeH2(label) {
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
function makeP(children, className = null, center = false) {
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
const resCombHeader = makeH2(getStr("Find Resistor Combinations"));
const resCombInputBox = new ValueBox("5.1k");
function main(container) {
	container.appendChild(makeDiv([
		makeResistorCombinatorUI(),
		makeDividerCombinatorUI(),
		makeCapacitorCombinatorUI(),
		makeCurrentLimitingUI()
	]));
}
function makeResistorCombinatorUI() {
	const rangeSelector = new ValueRangeSelector(ComponentType.Resistor);
	const numElementsInput = new ValueBox("3");
	const resultBox = makeDiv();
	const ui = makeDiv([
		resCombHeader,
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
				numElementsInput.inputBox,
				""
			],
			[
				getStr("Target Value"),
				resCombInputBox.inputBox,
				"Ω"
			]
		]),
		resultBox
	]);
	const callback = () => {
		resultBox.innerHTML = "";
		try {
			const custom = rangeSelector.seriesSelect.value === "custom";
			setVisible(parentTrOf(rangeSelector.customValuesInput), custom);
			setVisible(parentTrOf(rangeSelector.minResisterInput.inputBox), !custom);
			setVisible(parentTrOf(rangeSelector.maxResisterInput.inputBox), !custom);
			const targetValue = resCombInputBox.value;
			const availableValues = rangeSelector.getAvailableValues(targetValue);
			const maxElements = numElementsInput.value;
			const combs = findCombinations(ComponentType.Resistor, availableValues, targetValue, maxElements);
			if (combs.length > 0) {
				resultBox.appendChild(makeP(getStr("Found <n> combination(s):", { n: combs.length })));
				for (const comb of combs) {
					resultBox.appendChild(comb.generateSvg(targetValue));
					resultBox.appendChild(document.createTextNode(" "));
				}
			} else resultBox.appendChild(makeP(getStr("No combinations found.")));
		} catch (e) {
			resultBox.appendChild(makeP(`Error: ${e.message}`));
		}
	};
	rangeSelector.setOnChange(callback);
	resCombInputBox.setOnChange(callback);
	numElementsInput.setOnChange(callback);
	callback();
	return ui;
}
function makeCapacitorCombinatorUI() {
	const rangeSelector = new ValueRangeSelector(ComponentType.Capacitor);
	const targetInput = new ValueBox("3.14μ");
	const numElementsInput = new ValueBox("3");
	const resultBox = makeDiv();
	const ui = makeDiv([
		makeH2(getStr("Find Capacitor Combinations")),
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
				"F"
			],
			[
				getStr("Minimum"),
				rangeSelector.minResisterInput.inputBox,
				"F"
			],
			[
				getStr("Maximum"),
				rangeSelector.maxResisterInput.inputBox,
				"F"
			],
			[
				getStr("Max Elements"),
				numElementsInput.inputBox,
				""
			],
			[
				getStr("Target Value"),
				targetInput.inputBox,
				"F"
			]
		]),
		resultBox
	]);
	const callback = () => {
		resultBox.innerHTML = "";
		try {
			const custom = rangeSelector.seriesSelect.value === "custom";
			setVisible(parentTrOf(rangeSelector.customValuesInput), custom);
			setVisible(parentTrOf(rangeSelector.minResisterInput.inputBox), !custom);
			setVisible(parentTrOf(rangeSelector.maxResisterInput.inputBox), !custom);
			const targetValue = targetInput.value;
			const availableValues = rangeSelector.getAvailableValues(targetValue);
			const maxElements = numElementsInput.value;
			const combs = findCombinations(ComponentType.Capacitor, availableValues, targetValue, maxElements);
			if (combs.length > 0) {
				resultBox.appendChild(makeP(getStr("Found <n> combination(s):", { n: combs.length })));
				for (const comb of combs) {
					resultBox.appendChild(comb.generateSvg(targetValue));
					resultBox.appendChild(document.createTextNode(" "));
				}
			} else resultBox.appendChild(makeP(getStr("No combinations found.")));
		} catch (e) {
			resultBox.appendChild(makeP(`Error: ${e.message}`));
		}
	};
	rangeSelector.setOnChange(callback);
	targetInput.setOnChange(callback);
	numElementsInput.setOnChange(callback);
	callback();
	return ui;
}
function makeDividerCombinatorUI() {
	const rangeSelector = new ValueRangeSelector(ComponentType.Resistor);
	const targetInput = new ValueBox("3.3 / 5.0");
	const totalMinBox = new ValueBox("10k");
	const totalMaxBox = new ValueBox("100k");
	const numElementsInput = new ValueBox("2");
	const resultBox = makeDiv();
	const ui = makeDiv([
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
				numElementsInput.inputBox,
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
				targetInput.inputBox,
				""
			]
		]),
		resultBox
	]);
	const callback = () => {
		resultBox.innerHTML = "";
		try {
			const custom = rangeSelector.seriesSelect.value === "custom";
			setVisible(parentTrOf(rangeSelector.customValuesInput), custom);
			setVisible(parentTrOf(rangeSelector.minResisterInput.inputBox), !custom);
			setVisible(parentTrOf(rangeSelector.maxResisterInput.inputBox), !custom);
			const targetValue = targetInput.value;
			const totalMin = totalMinBox.value;
			const totalMax = totalMaxBox.value;
			const availableValues = rangeSelector.getAvailableValues((totalMin + totalMax) / 2);
			const maxElements = numElementsInput.value;
			const combs = findDividers(ComponentType.Resistor, availableValues, targetValue, totalMin, totalMax, maxElements);
			if (combs.length > 0) {
				resultBox.appendChild(makeP(getStr("Found <n> combination(s):", { n: combs.length })));
				for (const comb of combs) {
					resultBox.appendChild(comb.generateSvg(targetValue));
					resultBox.appendChild(document.createTextNode(" "));
				}
			} else resultBox.appendChild(makeP(getStr("No combinations found.")));
		} catch (e) {
			resultBox.appendChild(makeP(`Error: ${e.message}`));
		}
	};
	rangeSelector.setOnChange(callback);
	targetInput.setOnChange(callback);
	numElementsInput.setOnChange(callback);
	totalMinBox.setOnChange(callback);
	totalMaxBox.setOnChange(callback);
	callback();
	return ui;
}
function makeCurrentLimitingUI() {
	const powerVoltageInput = new ValueBox("3.3");
	const forwardVoltageInput = new ValueBox("2");
	const forwardCurrentInput = new ValueBox("1m");
	const resultBox = document.createElement("pre");
	const ui = makeDiv([
		makeH2(getStr("Find LED Current Limiting Resistor")),
		makeTable([
			[
				getStr("Item"),
				getStr("Value"),
				getStr("Unit")
			],
			[
				getStr("Power Voltage"),
				powerVoltageInput.inputBox,
				"V"
			],
			[
				getStr("Forward Voltage"),
				forwardVoltageInput.inputBox,
				"V"
			],
			[
				getStr("Forward Current"),
				forwardCurrentInput.inputBox,
				"A"
			]
		]),
		resultBox
	]);
	const callback = () => {
		try {
			const vCC = powerVoltageInput.value;
			const vF = forwardVoltageInput.value;
			const iF = forwardCurrentInput.value;
			const vR = vCC - vF;
			const rIdeal = vR / iF;
			let results = [{
				label: getStr("Ideal Value"),
				r: formatValue(rIdeal, "Ω"),
				i: formatValue(iF, "A"),
				p: formatValue(vR * iF, "W")
			}];
			let rLast = 0;
			for (const seriesName in SERIESES) {
				const series = makeAvaiableValues(seriesName);
				let rApprox = 0;
				{
					const epsilon = iF * 1e-6;
					let bestDiff = Infinity;
					for (const r of series) {
						const i = (vCC - vF) / r;
						const diff = Math.abs(iF - i);
						if (diff - epsilon < bestDiff) {
							bestDiff = diff;
							rApprox = r;
						}
					}
				}
				if (rApprox !== rLast) {
					const iApprox = (vCC - vF) / rApprox;
					const pApprox = vR * iApprox;
					results.push({
						label: `${getStr("<s> Approximation", { s: seriesName })}`,
						r: formatValue(rApprox, "Ω"),
						i: formatValue(iApprox, "A"),
						p: formatValue(pApprox, "W")
					});
					if (Math.abs(rApprox - rIdeal) < rIdeal * 1e-6) break;
				}
				rLast = rApprox;
			}
			let resultText = "";
			for (const res of results) resultText += `${res.label}: ${res.r} (${res.i}, ${res.p})\n`;
			resultBox.textContent = resultText;
		} catch (e) {
			resultBox.textContent = `Error: ${e.message}`;
		}
	};
	powerVoltageInput.setOnChange(callback);
	forwardVoltageInput.setOnChange(callback);
	forwardCurrentInput.setOnChange(callback);
	callback();
	return ui;
}

//#endregion
export { main };