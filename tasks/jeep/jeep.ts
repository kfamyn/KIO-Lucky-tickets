import './jeep.scss'
import {KioApi, KioParameterDescription, KioResourceDescription, KioTask, KioTaskSettings} from "../KioApi";
import {Field, LinearField} from "./model/Field";
import {FieldState} from "./model/FieldState";
import {HistoryView} from "./view/HistoryView";
import {History} from "./model/History";
import {Slider} from './view/Slider';
import {Constants} from "./Constants";
import {FieldView} from "./view/FieldView";
import {Position} from "./model/Position";
import {MoveTo, PickOrPut, StepType} from "./model/Step";

export class Jeep implements KioTask {
    private readonly _constants: Constants;
    private _kioapi: KioApi;
    private domNode: HTMLElement;
    private level: number;
    private canvas: HTMLCanvasElement;
    private controls: HTMLDivElement;

    private history: History;
    private field: Field;

    private field_view: FieldView;
    private history_view: HistoryView;
    private slider: Slider;

    constructor(settings: KioTaskSettings) {
        this._constants = new Constants(settings);

        let level = +settings.level;
        let steps = 32;
        switch (level) {
            case 0:
                steps = 16;
                this._constants.CAR_MAX_FUEL = 10;
                break;
            case 1:
                steps = 24;
                this._constants.CAR_MAX_FUEL = 12;
                break;
            case 2:
                this._constants.CAR_MAX_FUEL = 12;
                steps = 32;
                break;
        }

        let h = 46 + 2 + 63 / 2 + 2;
        this.field = new LinearField(
            this,
            [30, h],
            [870, h],
            steps,
            900,
            140
        );
        let initial_state = FieldState.create(this.field);
        this.history = new History([new PickOrPut(0)], initial_state, this.field.all_positions);

        this.level = settings.level ? 0 : +settings.level;
    }

    id(): string {
        return "jeep" + this.level;
    }

    initialize(domNode: HTMLElement, kioapi: KioApi, preferred_width: number) {
        console.log('preferred width in problem initialization', preferred_width);

        this._kioapi = kioapi;
        this.domNode = domNode;

        domNode.innerHTML = `<div style="background: url(${kioapi.basePath}jeep-resources/sand4.jpg)">
                <canvas
                    style="display: block"
                    width="900" height="120"
                    class="task-canvas"
                ></canvas><div style="display: block">
                    <div class="task-history"></div><div class="task-controls"></div>
                    <div style="clear: both"></div>
                </div>
            </div>`;
        let canvas = domNode.getElementsByClassName('task-canvas')[0] as HTMLCanvasElement;
        let history = domNode.getElementsByClassName('task-history')[0] as HTMLDivElement;
        let controls = domNode.getElementsByClassName('task-controls')[0] as HTMLDivElement;
        canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
        this.canvas = canvas;
        this.controls = controls;

        this.slider = new Slider(
            -5,
            5,
            27 + 20 + 20,
            kioapi.getResource('slider'),
            kioapi.getResource('slider-hover'),
            kioapi.getResource('slider-line'),
            1
        );
        controls.appendChild(this.slider.canvas);
        this.slider.onvaluechange = (new_value: number) => this.fuel_value_change(new_value);
        this.slider.add_ticks(1, 10, '#e6ffe0', 17);
        this.slider.add_ticks(5, 15, '#e6ffe0');
        this.slider.set_visible_range(-this.constants.CAR_MAX_FUEL, this.constants.CAR_MAX_FUEL);

        console.log('problem level is', this.level);

        this.field_view = new FieldView(this.field, canvas, (p: Position) => this.car_position_change(p));
        this.history_view = new HistoryView(history, this.history);
        this.history_view.add_listener(() => this.history_updated());

        this.field_view.field_state = this.history.initial_state;

        this.history_updated();

        let viewportResizeObserver = new ResizeObserver(entries => this.resize_elements());
        viewportResizeObserver.observe(domNode);
        this.resize_elements();
    }

    resize_elements() {
        this.field_view.width = this.domNode.clientWidth;
        this.slider.resize(this.controls.clientWidth);
        this.field_view.redraw();
    }

    parameters(): KioParameterDescription[] {
        return [
            {
                name: "far_with_return",
                title: "Дальность с возвращением",
                ordering: 'maximize'
            },
            {
                name: "far",
                title: "Дальность",
                ordering: 'maximize'
            },
            {
                name: "total_fuel",
                title: "Использовано топлива",
                ordering: 'minimize'
            },
            {
                name: "steps",
                title: "Количество шагов",
                ordering: 'minimize'
            }
        ];
    }

    get kioapi(): KioApi {
        return this._kioapi;
    }

    static preloadManifest(): KioResourceDescription[] {
        return [
            // {id: "sand", src: "jeep-resources/sand4.jpg"},
            {id: "jeep", src: "jeep-resources/SimpleGreenCarTopView.png"},
            {id: "barrel", src: "jeep-resources/SteelBarrel.png"},
            {id: 'slider', src: "jeep-resources/slider.png"},
            {id: 'slider-hover', src: "jeep-resources/slider-hover.png"},
            {id: 'slider-line', src: "jeep-resources/slider-line.png"},
            {id: 'cactus', src: "jeep-resources/cactus.png"}
        ];
    };

    solution(): Solution {
        return this.history.serialize();
    };

    loadSolution(solution: Solution): void {
        console.log(solution);
        this.history.load(solution);
        this.history_view.current_index = this.history.size - 1;
        this.history.update_field_states();
    }


    get constants(): Constants {
        return this._constants;
    }

    // handlers

    fuel_value_change(new_value: number) {
        let current_step = this.history_view.current_step;
        let new_step = new PickOrPut(new_value);
        if (current_step != null && current_step.type == StepType.FUEL)
            this.history_view.update_current_step(new_step);
        else
            // this.history_view.insert_next(new_step);
            this.history_view.update_next_step(new_step);
    }

    car_position_change(new_position: Position) {
        let current_step = this.history_view.current_step;
        let new_step = new MoveTo(new_position);
        if (current_step != null && current_step.type == StepType.DRIVE) {
            if (this.history_view.may_update_current_step(new_step))
                this.history_view.update_current_step(new_step);
        } else {
            if (this.history_view.may_update_next_step(new_step))
                // this.history_view.insert_next(new_step);
                this.history_view.update_next_step(new_step);
        }
    }

    history_updated() {
        // state 0   -    state 1    -   state 2
        //         step 0         [step 1]

        let current_step_index = this.history_view.current_index;

        let step = this.history.step(current_step_index);
        let previous_state = this.history.state(current_step_index);
        let next_state = this.history.state(current_step_index + 1);
        let current_step_type: StepType = step.type;

        //setup highlighted circle
        let state_for_highlighted_circle: FieldState = current_step_type === StepType.DRIVE ? previous_state : next_state;
        this.field_view.set_highlighted_circle(state_for_highlighted_circle.car_position, state_for_highlighted_circle.car_fuel);

        //setup slider
        let state_for_fuel_info: FieldState = step.type === StepType.FUEL ? previous_state : next_state;
        this.slider.max_value = state_for_fuel_info.possible_to_pick();
        this.slider.min_value = -state_for_fuel_info.car_fuel;
        this.slider.value_no_fire = step.type == StepType.DRIVE ? 0 : (step as PickOrPut).amount;

        this.field_view.field_state = next_state;
        //    pick - move - put - move
        // s0     s1     s2     s3    s4
        //        *             *

        this.kioapi.submitResult({
            "far": this.history.max_far,
            "far_with_return": this.history.max_far_with_return,
            "total_fuel": this.history.total_fuel,
            "steps": this.history.last_correct_step_index + 1
        });
    }
}

interface Solution {
}
