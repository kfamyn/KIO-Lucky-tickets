import {KioParameterDescription, KioTaskParameters, KioTaskSettings} from "../KioApi";

export class Jeep implements KioTaskParameters {

    constructor(settings: KioTaskSettings) {
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
}
