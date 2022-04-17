import {LinearField} from "./Field";

export type Point = [x: number, y: number];

export interface Position {
    get text(): string;
    distance(other: Position): number;
    get index(): number;
    get point(): Point;
}

export class LinearPosition implements Position {
    private readonly field: LinearField;
    private readonly ind: number;

    constructor(field: LinearField, ind: number) {
        this.field = field;
        this.ind = ind;
    }

    distance(other: Position): number {
        let o = other as LinearPosition;
        return Math.abs(o.ind - this.ind) * this.field.jeep.constants.FUEL_PER_UNIT;
    }

    get text(): string {
        return "" + this.ind;
    }

    get available(): boolean {
        return false;
    }

    get index(): number {
        return this.ind;
    }

    get point(): Point {
        let [x1, y1] = this.field.start;
        let n = this.field.size;
        let [x2, y2] = this.field.finish;
        let dx = x2 - x1;
        let dy = y2 - y1;
        let vx = dx / (n - 1);
        let vy = dy / (n - 1);
        return [x1 + this.ind * vx, y1 + this.ind * vy];
    }
}
