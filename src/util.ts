
export const isNumber = (value: any) => typeof value === 'number';

export const enumIsNumeric = (enm: object) => Object.values(enm).filter(isNumber).length > 0;

export const enumLength = (enm: object) => Object.values(enm).filter(isNumber).length || Object.values(enm).length;

export const enumLabels = (enm: object) => Object.values(enm).slice(0, enumLength(enm));

export const enumValues = (enm: object) => enumIsNumeric(enm) ? Object.values(enm).slice(enumLength(enm)) as number[] : Object.keys(enm);
