import {MoveTo, PickOrPut, Step, StepType} from "./Step";
import {FieldState} from "./FieldState";
import {Position} from "./Position";

export class History {
    private _steps: Step[];
    private _update_listeners: (() => void)[] = [];
    private _initial_state: FieldState;
    private list_of_states: FieldState[] = null;

    private _max_far: number;
    private _max_far_with_return: number;
    private _total_fuel: number;
    private all_positions: Position[];

    constructor(steps: Step[], initial_state: FieldState, all_positions: Position[]) {
        this._steps = steps;
        this._initial_state = initial_state;
        this.update_field_states();
        this.all_positions = all_positions;
    }

    get steps(): Step[] {
        return this._steps;
    }

    step(index: number): Step {
        return this._steps[index];
    }

    state(index: number): FieldState {
        this.ensure_states_evaluated();
        if (index < 0)
            return this._initial_state;
        if (this.list_of_states.length <= index)
            return this.list_of_states[this.list_of_states.length - 1];
        return this.list_of_states[index];
    }

    update(index: number, step: Step): void {
        this._steps[index] = step;
        this.fire_update();
        this.update_field_states(index);
    }

    evaluate_parameters() {
        let current_far = 0;
        let max_far = 0;
        let max_far_with_return = 0;
        let total_fuel = 0;
        for (let i = 0; i < this.list_of_states.length; i++) {
            let state = this.list_of_states[i];
            current_far = state.car_position.index;
            if (current_far > max_far)
                max_far = current_far;

            if (current_far == 0 || current_far == this._initial_state.field_length - 1) {
                if (max_far > max_far_with_return)
                    max_far_with_return = max_far;
            }

            if (i < this.list_of_states.length - 1) {
                let step = this._steps[i];
                if (step.type == StepType.FUEL && current_far == 0) {
                    let amount = (step as PickOrPut).amount;
                    if (amount > 0)
                        total_fuel += amount;
                }
            }
        }

        this._max_far = max_far;
        this._max_far_with_return = max_far_with_return;
        this._total_fuel = total_fuel;
    }

    insert(index: number, step: Step): void {
        let previous_step_type = index == 0 ? StepType.DRIVE : this._steps[index - 1].type;
        let new_step_type = step.type;
        // [state 0] - [step 0] - [state 1] - [step 1] - [state 2]
        if (index <= this._steps.length - 1) {
            let last_state = this.state(index);
            if (new_step_type === StepType.DRIVE && previous_step_type === StepType.FUEL) {
                this._steps.splice(index, 0, step, new PickOrPut(0));
            } else if (new_step_type === StepType.FUEL && previous_step_type === StepType.DRIVE) {
                this._steps.splice(index, 0, step, new MoveTo(last_state.car_position));
            } else if (new_step_type === StepType.DRIVE && previous_step_type === StepType.DRIVE) {
                this._steps.splice(index, 0, new PickOrPut(0), step);
            } else if (new_step_type === StepType.FUEL && previous_step_type === StepType.FUEL) {
                this._steps.splice(index, 0, new MoveTo(last_state.car_position), step);
            }
        } else {
            this._steps.splice(index, 0, step);
        }
        this.fire_update();
        this.update_field_states(index);
    }

    get size(): number {
        return this._steps.length;
    }

    get last_correct_step_index(): number {
        this.ensure_states_evaluated();
        return this.list_of_states.length - 2;
    }

    add_listener(listener: () => void): void {
        this._update_listeners.push(listener);
    }

    fire_update(): void {
        for (const updateListener of this._update_listeners)
            updateListener();
    }

    //          steps :   0   1   2   3   4
    // list of states : 0   1   2   3   4   5

    update_field_states(index: number = 0 /* first changed index of 'steps' */) {
        this.ensure_states_evaluated();

        this.list_of_states.splice(index + 1);
        let last_state = this.list_of_states[index];
        if (!last_state)
            return;

        let n = this.size;
        for (let i = index; i < n; i++) {
            let next_step = this._steps[i];
            if (!next_step.change_possible(last_state))
                break;
            let next_state = next_step.change_state(last_state);
            this.list_of_states.push(next_state);
            last_state = next_state;
        }
        this.evaluate_parameters();
        this.fire_update();
    }

    ensure_states_evaluated() {
        if (this.list_of_states == null) {
            this.list_of_states = [this._initial_state];
            this.update_field_states(0);
        }
    }

    get initial_state(): FieldState {
        return this._initial_state;
    }

    get max_far(): number {
        return this._max_far;
    }

    get max_far_with_return(): number {
        return this._max_far_with_return;
    }

    get total_fuel(): number {
        return this._total_fuel;
    }

    serialize(): object {
        let o = [];

        for (let s of this._steps) {
            if (s.type == StepType.FUEL)
                o.push((s as PickOrPut).amount);
            else
                o.push((s as MoveTo).position.index);
        }

        return o;
    }

    load(o: any) {
        this._steps = [];
        let move = false;
        for (let s of o) {
            if (move) {
                this._steps.push(new MoveTo(this.all_positions[s]));
                move = false;
            } else {
                this._steps.push(new PickOrPut(s));
                move = true;
            }
        }
    }
}
