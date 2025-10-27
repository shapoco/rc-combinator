

export function evalExpr(expStr: string): number {
  const sr = new StringReader(expStr);
  const ret = expr(sr);
  sr.skipWhitespace();
  if (!sr.eof()) {
    throw new Error('Unexpected characters at the end of expression');
  }
  return ret;
}

function expr(sr: StringReader): number {
  return addSub(sr);
}

function addSub(sr: StringReader): number {
  sr.skipWhitespace();
  let left = mulDiv(sr);
  sr.skipWhitespace();
  while (sr.readIfMatch('+') || sr.readIfMatch('-')) {
    const op = sr.readIfSymbol();
    sr.skipWhitespace();
    const right = mulDiv(sr);
    sr.skipWhitespace();
    left = op === '+' ? left + right : left - right;
  }
  return left;
}

function mulDiv(sr: StringReader): number {
  sr.skipWhitespace();
  let left = operand(sr);
  sr.skipWhitespace();
  while (sr.readIfMatch('*') || sr.readIfMatch('/')) {
    const op = sr.readIfSymbol();
    sr.skipWhitespace();
    const right = operand(sr);
    sr.skipWhitespace();
    left = op === '*' ? left * right : left / right;
  }
  return left;
}

function operand(sr: StringReader): number {
  sr.skipWhitespace();

  if (sr.readIfMatch('(')) {
    const val = expr(sr);
    sr.skipWhitespace();
    sr.expect(')');
    return val;
  }

  const num = sr.readNumber();
  sr.skipWhitespace();
  let prefix = sr.readIfPrefix();
  switch (prefix) {
    case 'p':
      return num * 1e-12;
    case 'n':
      return num * 1e-9;
    case 'u':
    case 'μ':
      return num * 1e-6;
    case 'm':
      return num * 1e-3;
    case 'k':
    case 'K':
      return num * 1e3;
    case 'M':
      return num * 1e6;
    case 'G':
      return num * 1e9;
    case 'T':
      return num * 1e12;
    default:
      if (prefix) {
        sr.back(1);
      }
      return num;
  }
}

class StringReader {
  static RE_CHARS_TO_BE_QUOTED = /[\{\}\[\]:,\\]/;
  static KEYWORDS = ['true', 'false', 'null'];

  pos = 0;

  constructor(private str: string) {}

  peek(length = 1): string|null {
    if (this.pos + length > this.str.length) {
      return null;
    }
    return this.str.substring(this.pos, this.pos + length);
  }

  read(length = 1): string {
    const s = this.peek(length);
    if (s === null) {
      throw new Error('Unexpected end of string');
    }
    this.pos += length;
    return s;
  }

  back(length = 1): void {
    this.pos -= length;
    if (this.pos < 0) {
      throw new Error('Position out of range');
    }
  }

  readIfMatch(s: string): boolean {
    const len = s.length;
    if (this.peek(len) === s) {
      this.pos += len;
      return true;
    }
    return false;
  }

  readDecimalString(): string {
    let numStr = '';
    while (true) {
      const ch = this.peek();
      if (ch !== null && /[0-9]/.test(ch)) {
        numStr += this.read();
      } else {
        break;
      }
    }
    if (numStr.length === 0) {
      throw new Error('Decimal number expected');
    }
    return numStr;
  }

  readIfNumber(): number|null {
    let numStr = '';
    if (this.readIfMatch('-')) {
      numStr += '-';
    } else if (this.readIfMatch('+')) {
      numStr += '+';
    } else {
      const first = this.peek();
      if (first === null || !/[0-9]/.test(first)) {
        return null;
      }
    }
    numStr += this.readDecimalString();

    if (this.readIfMatch('.')) {
      numStr += '.';
      numStr += this.readDecimalString();
    }
    if (this.readIfMatch('e') || this.readIfMatch('E')) {
      numStr += 'e';
      if (this.readIfMatch('+')) {
        numStr += '+';
      } else if (this.readIfMatch('-')) {
        numStr += '-';
      }
      numStr += this.readDecimalString();
    }
    return Number(numStr);
  }

  readNumber(): number {
    const num = this.readIfNumber();
    if (num === null) {
      throw new Error('Number expected');
    }
    return num;
  }

  readIfSymbol(): string|null {
    const ch = this.peek();
    if (ch !== null && /[\(\)\/\*\+\-]/.test(ch)) {
      return this.read();
    }
    return null;
  }

  readIfPrefix(): string|null {
    const ch = this.peek();
    if (ch !== null && /[pnuμmkKMGT]/.test(ch)) {
      return this.read();
    }
    return null;
  }

  // readIdentifier() : string | null {
  //   const id = this.readIfIdentifier();
  //   if (id === null) {
  //     throw new Error('Identifier expected');
  //   }
  //   return id;
  // }

  expect(s: string): void {
    if (this.readIfMatch(s)) {
      return;
    }
    throw new Error(`Keyword "${s}" expected`);
  }

  readIfStringChar(quotation: string|null): string|null {
    const ch = this.peek();
    if (ch === null) {
      throw new Error('Unexpected end of string');
    } else if (quotation && ch === quotation) {
      return null;
    } else if (!quotation && StringReader.RE_CHARS_TO_BE_QUOTED.test(ch)) {
      return null;
    } else if (ch === '\\') {
      this.read();
      const esc = this.read();
      switch (esc) {
        case '"':
          return '"';
        case '\\':
          return '\\';
        case '/':
          return '/';
        case 'b':
          return '\b';
        case 'f':
          return '\f';
        case 'n':
          return '\n';
        case 'r':
          return '\r';
        case 't':
          return '\t';
        case 'u':
          let hex = '';
          for (let i = 0; i < 4; i++) {
            const h = this.read();
            if (!/[0-9a-fA-F]/.test(h)) {
              throw new Error('Invalid Unicode escape');
            }
            hex += h;
          }
          return String.fromCharCode(parseInt(hex, 16));
        default:
          throw new Error('Invalid escape character');
      }
    } else {
      return this.read();
    }
  }

  readIfString(): string|null {
    const next = this.peek();

    if (next === null) return null;

    if (next === '"' || next === '\'') {
      const quotation = this.read();
      let str = '';
      while (true) {
        const ch = this.readIfStringChar(quotation);
        if (ch === null) {
          break;
        }
        str += ch;
      }
      this.expect(quotation);
      return str;
    }

    if (next && !StringReader.RE_CHARS_TO_BE_QUOTED.test(next) ||
        !/[0-9]/.test(next)) {
      let str = '';
      while (true) {
        const ch = this.readIfStringChar(null);
        if (ch === null) {
          break;
        }
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

  readString(): string {
    const str = this.readIfString();
    if (str === null) {
      throw new Error('String expected');
    }
    return str;
  }

  readIfBoolean(): boolean|null {
    if (this.readIfMatch('true')) {
      return true;
    }
    if (this.readIfMatch('false')) {
      return false;
    }
    return null;
  }

  skipWhitespace(): void {
    while (true) {
      const ch = this.peek();
      if (ch !== null && /\s/.test(ch)) {
        this.read();
      } else {
        break;
      }
    }
  }

  eof(): boolean {
    return this.pos >= this.str.length;
  }
}