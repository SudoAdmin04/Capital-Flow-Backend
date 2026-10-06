import { ValueTransformer } from 'typeorm';

/** Guarda DECIMAL(14,2) como number redondeado a 2 decimales. */
export const decimalTransformer: ValueTransformer = {
  to: (value: number | null | undefined) =>
    value === null || value === undefined ? value : Number(value),
  from: (value: string | number | null) =>
    value === null || value === undefined ? value : Number(value),
};

export function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
