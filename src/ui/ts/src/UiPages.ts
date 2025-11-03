import * as RcmbUi from './RcmbUi';
import * as Schematics from './Schematics';
import {getStr} from './Text';

export class UiPage {
  public ui: HTMLDivElement|null = null;
  constructor(public title: string) {}
  onActivate(): void {}
}

export function drawErrorText(
    ctx: CanvasRenderingContext2D, y: number, valTyp: number, valMin: number,
    valMax: number, targetTyp: number, targetMin: number,
    targetMax: number): number {
  const targetErrMin = (targetMin - targetTyp) / targetTyp;
  const targetErrMax = (targetMax - targetTyp) / targetTyp;
  const typErr = (valTyp - targetTyp) / targetTyp;
  const minErr = (valMin - targetTyp) / targetTyp;
  const maxErr = (valMax - targetTyp) / targetTyp;
  const nums = [
    {err: (valMin - targetTyp) / targetTyp, str: '', width: 0, color: '#000'},
    {err: (valTyp - targetTyp) / targetTyp, str: '', width: 0, color: '#000'},
    {err: (valMax - targetTyp) / targetTyp, str: '', width: 0, color: '#000'},
  ];

  ctx.save();
  ctx.font = `${16 * Schematics.SCALE}px sans-serif`;
  for (let num of nums) {
    num.str = RcmbUi.formatError(num.err);
    num.width = ctx.measureText(num.str).width;
    if (Math.abs(num.err) < 1e-6) {
      num.color = '#04c';
    } else if (num.err < targetErrMin || targetErrMax < num.err) {
      num.color = '#c00';
    }
  }
  if (Math.abs(minErr) < 1e-18 && Math.abs(maxErr) < 1e-6) {
    ctx.fillStyle = '#04c';
    ctx.fillText(`${getStr('No Error')}`, 0, y);
    y += 16 + 10;
  } else {
    const sepWidth = ctx.measureText(' / ').width;
    let x = sepWidth;
    for (const num of nums) {
      x -= num.width + sepWidth;
    }
    x /= 2;
    ctx.fillText(`${getStr('Error')} (min/typ/max):`, 0, y);
    y += 16 + 5;
    ctx.textAlign = 'left';
    for (let i = 0; i < nums.length; i++) {
      const num = nums[i];
      ctx.fillStyle = num.color;
      ctx.fillText(num.str, x, y);
      x += num.width;
      if (i < nums.length - 1) {
        ctx.fillStyle = '#000';
        ctx.fillText(' / ', x, y);
        x += sepWidth;
      }
    }
    y += 16 + 10;
    ctx.restore();
  }
  return y;
}