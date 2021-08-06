
export const isNumber = (value: any) => typeof value === 'number';

export const enumIsNumeric = (enm: object) => Object.values(enm).filter(isNumber).length > 0;

export const enumLength = (enm: object) => Object.values(enm).filter(isNumber).length || Object.values(enm).length;

export const enumLabels = (enm: object) => Object.values(enm).slice(0, enumLength(enm));

export const enumValues = (enm: object) => enumIsNumeric(enm) ? Object.values(enm).slice(enumLength(enm)) as number[] : Object.keys(enm);

export const deg2Rad = (d:number) => d/180*Math.PI;

export const rad2Deg = (r:number) => r/Math.PI*180;

export const vecLen = (x:number, y:number) => Math.sqrt(x*x + y*y);

export const constrainRange = (x:number, min:number, max:number) => {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}
