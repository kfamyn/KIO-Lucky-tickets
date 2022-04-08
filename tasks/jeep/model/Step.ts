import {FieldState} from "./FieldState";
import {Position} from "./Position";

export enum StepType {
    DRIVE, FUEL
}

export interface Step {
    get text(): string;
    get value(): string | number;
    change_state(fs: FieldState): FieldState;
    change_possible(fs: FieldState): boolean;
    get type(): StepType;
}

export class MoveTo implements Step {
    private readonly _position: Position;

    constructor(position: Position) {
        this._position = position;
    }

    get position(): Position {
        return this._position;
    }

    get text(): string {
        return "Переместись в";
    }

    get value(): string | number {
        return this.position.text;
    }

    change_state(fs: FieldState): FieldState {
        return fs.move(this._position);
    }

    get type() {
        return StepType.DRIVE;
    }

    change_possible(fs: FieldState): boolean {
        return fs.may_move(this._position);
    }
}

export class Pick implements Step {
    private readonly _amount: number;

    constructor(amount: number) {
        this._amount = amount;
    }

    get amount(): number {
        return this._amount;
    }

    get text(): string {
        return "Возьми топливо";
    }

    get value(): string | number {
        return this._amount;
    }

    change_state(fs: FieldState): FieldState {
        return fs.pick(this._amount);
    }

    get type() {
        return StepType.FUEL;
    }

    change_possible(fs: FieldState): boolean {
        return fs.may_pick(this._amount);
    }
}

export class Put implements Step {
    private readonly _amount: number;

    constructor(amount: number) {
        this._amount = amount;
    }

    get amount(): number {
        return this._amount;
    }

    get text(): string {
        return "Оставь топливо";
    }

    get value(): string | number {
        return this._amount;
    }

    change_state(fs: FieldState): FieldState {
        return fs.put(this._amount);
    }

    get type() {
        return StepType.FUEL;
    }

    change_possible(fs: FieldState): boolean {
        return fs.may_put(this._amount);
    }
}

export class PickOrPut implements Step {
    private readonly _amount: number;

    constructor(amount: number) {
        this._amount = amount;
    }

    get amount(): number {
        return this._amount;
    }

    get text(): string {
        if (this._amount == 0)
            return "Ничего не делай";

        if (this._amount < 0)
            return "Оставь бензин";
        else
            return "Наполни бак бензином"
    }

    get value(): string | number {
        if (this._amount == 0)
            return '';
        return Math.abs(this._amount);
    }

    change_state(fs: FieldState): FieldState {
        if (this._amount < 0)
            return fs.put(-this._amount);
        else
            return fs.pick(this._amount);
    }

    get type() {
        return StepType.FUEL;
    }

    change_possible(fs: FieldState): boolean {
        if (this._amount < 0)
            return fs.may_put(-this._amount);
        else
            return fs.may_pick(this._amount);
    }
}
