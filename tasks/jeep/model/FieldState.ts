import {Field} from "./Field";
import {Position} from "./Position";
import {Step} from "./Step";

export class FieldState {
    private readonly field: Field;
    private readonly values: number[];
    private readonly _car_position: Position;
    private readonly _car_fuel: number;

    static create(field: Field) {
        let n = field.size;
        let values = new Array(n).fill(0);
        values[0] = +Infinity;
        let car_fuel = 0;
        return new FieldState(field, values, field.initial_position, car_fuel);
    }

    constructor(field: Field, values: number[], car_position: Position, car_fuel: number) {
        this.field = field;
        this.values = values;
        this._car_position = car_position;
        this._car_fuel = car_fuel;
    }

    available_to_pick(): number {
        return this.values[this._car_position.index];
    }

    possible_to_pick(): number {
        return Math.min(this.available_to_pick(), this.field.jeep.constants.CAR_MAX_FUEL - this._car_fuel);
    }

    pick(amount: number): FieldState {
        if (amount > this.possible_to_pick())
            throw new Error(`Trying to pick ${amount} of fuel, but the car already has ${this._car_fuel} and only ${this.available_to_pick()} is available`);

        let new_values = this.values.slice();
        new_values[this._car_position.index] -= amount;

        return new FieldState(this.field, new_values, this._car_position, this._car_fuel + amount);
    }

    may_pick(amount: number): boolean {
        return amount <= this.possible_to_pick();
    }

    put(amount: number): FieldState {
        if (amount > this._car_fuel)
            throw new Error("Trying to put ${amount} of fuel, but the car has only ${this.car_fuel}");

        let new_values = this.values.slice();
        new_values[this._car_position.index] += amount;

        return new FieldState(this.field, new_values, this._car_position, this._car_fuel - amount);
    }

    may_put(amount: number): boolean {
        return amount <= this._car_fuel;
    }

    move(new_position: Position): FieldState {
        let need_fuel = new_position.distance(this._car_position);
        if (need_fuel > this._car_fuel)
            throw new Error("Trying to put ${amount} of fuel, but the car has only ${this.car_fuel}");

        return new FieldState(this.field, this.values, new_position, this._car_fuel - need_fuel);
    }

    may_move(new_position: Position): boolean {
        let need_fuel = new_position.distance(this._car_position);
        return need_fuel <= this._car_fuel;
    }

    get_value(ind: number) {
        return this.values[ind];
    }


    get car_position(): Position {
        return this._car_position;
    }

    get car_fuel(): number {
        return this._car_fuel;
    }

    get str() {
        return `${this.car_fuel} at ${this.car_position.index} (${this.values.join(',')})`;
    }

    get field_length() {
        return this.values.length;
    }
}
