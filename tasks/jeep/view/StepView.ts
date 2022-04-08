import {MoveTo, Step} from "../model/Step";

export abstract class StepView {
    private _edit: Boolean;
    private _html_element: HTMLDivElement = document.createElement('div');
    protected info_element: HTMLSpanElement = document.createElement('span');
    protected edit_element: HTMLDivElement = document.createElement('div');

    constructor() {
        this._html_element.append(this.info_element, this.edit_element);
        this.edit = false;
    }

    get edit(): Boolean {
        return this._edit;
    }

    set edit(value: Boolean) {
        this._edit = value;
        this.edit_element.style.display = value ? 'block' : 'none';
    }

    get element(): HTMLElement {
        return this._html_element;
    }
}

export class MoveView extends StepView {

    private _move: MoveTo;

    constructor(move: MoveTo) {
        super();
        this.moveTo = move;
    }

    set moveTo(value: MoveTo) {
        
    }
}
