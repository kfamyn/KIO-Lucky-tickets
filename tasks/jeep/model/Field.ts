import {Jeep} from "../jeep";
import {LinearPosition, Point, Position} from "./Position";

export abstract class Field {
    protected _all_positions: Position[];

    public readonly jeep: Jeep;
    public readonly width: number;
    public readonly height: number;

    constructor(jeep: Jeep, width: number, height: number) {
        this.jeep = jeep;
        this.width = width;
        this.height = height;
    }

    get all_positions(): Position[] {
        return this._all_positions;
    }

    get size(): number {
        return this.all_positions.length;
    }

    get initial_position(): Position {
        return this._all_positions[0];
    }
}

export class LinearField extends Field {

    public readonly start: Point;
    public readonly finish: Point;
    private readonly steps: number;
    private readonly step_length: number;

    constructor(jeep: Jeep, start: Point, finish: Point, steps: number, width: number, height: number) {
        super(jeep, width, height);
        this.start = start;
        this.finish = finish;
        this.steps = steps;

        let [x1, y1] = this.start;
        let [x2, y2] = this.finish;

        let dx = x2 - x1;
        let dy = y2 - y1;
        this.step_length = Math.sqrt(dx * dx + dy * dy) / (steps + 1);

        // create all_positions
        this._all_positions = [];
        for (let i = 0; i < steps; i++)
            this._all_positions.push(new LinearPosition(this, i));
    }
}
