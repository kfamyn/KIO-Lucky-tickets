export interface KioApi {
    submitResult(result: {}): void;

    getResource(id: string): HTMLElement;

    problem: { message(msg: string): string; }

    basePath: string;
}


export interface KioTask {
    id(): string;

    initialize(domNode: HTMLElement, kioapi: KioApi, preferred_width: number): void;

    parameters(): KioParameterDescription[];

    solution(): {};

    loadSolution(solution: {}): void;

    settings?: KioTaskSettings;
}

export interface KioTaskStatic {
    new(settings: KioTaskSettings): KioTask;

    preloadManifest(): KioResourceDescription;
}

export interface KioTaskParameters {
    parameters(): KioParameterDescription[];
}

export interface KioTaskParametersStatic {
    new(settings: KioTaskSettings): KioTaskParameters;
}

export interface KioTaskSettings {
    level: string
    language?: string;
}

export interface KioResourceDescription {
    id: string,
    src: string
}

export interface KioParameterDescription {
    name: string,
    title: string,
    ordering: 'maximize' | 'minimize',
    view?: string | ((v: number) => string),
    normalize?: (v: number) => number
}
