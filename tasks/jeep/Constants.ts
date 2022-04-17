import {KioTaskSettings} from "../KioApi";

export class Constants {
    readonly level: number;
    CAR_MAX_FUEL: number = 12;
    FUEL_PER_UNIT: number = 1;

    constructor(settings: KioTaskSettings) {
        this.level = +settings.level;
    }
}
