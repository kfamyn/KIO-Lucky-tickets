import './luckytickets.scss'
import { KioApi, KioTask, KioParameterDescription, KioResourceDescription, KioTaskSettings } from "../KioApi";
import * as Blockly from '../../node_modules/blockly/core';
import '../../node_modules/blockly/blocks';
import '../../node_modules/blockly/javascript';

import * as Ru from '../../node_modules/blockly/msg/ru';
(Blockly as any).setLocale(Ru);

enum OperatorsList {
    IF = 'ЕСЛИ',
    THEN = 'ТО',
    ELSE = 'ИНАЧЕ',
    AND = 'И',
    LT = '<',
    LTE = '<=',
    GT = '>',
    GTE = '>=',
    EQUALS = '=',
    PLUS = '+',
    MINUS = '-',
    MULT = '*',
    DIVISION = '/',
    POW = '^'
}
interface AllowedOperations {
    [key: string]: PrimitiveOperation;
}

interface PrimitiveOperation {
    operation: string;
    userOperator: string;
    jsOperator: string;
}

const MathOperations: AllowedOperations = {
    sum: {
        operation: 'SUM',
        userOperator: '+',
        jsOperator: '+'
    },
    subtr: {
        operation: 'SUBTR',
        userOperator: '-',
        jsOperator: '-'
    },
    mult: {
        operation: 'MULT',
        userOperator: '*',
        jsOperator: '*'
    },
    division: {
        operation: 'DIVISION',
        userOperator: '/',
        jsOperator: '/'
    },
    power: {
        operation: 'POWER',
        userOperator: '^',
        jsOperator: '**'
    }
}
interface MathOperator {
    operation: string;
    userOperator: string;
    jsOperator: string;
}

type Comparator = '===' | '<' | '<=' | '>' | '>=' | '=';
type Conditionals = 'if' | 'then' | 'else';

interface BaseToken {
    operation: string;
    operands: any[];
}

interface ConditionExpression {
    condition: Conditionals | string;
    expression: string;
}

interface CompareExpression {
    comparator: Comparator | string;
    left: string;
    right: string;
}

const ToolboxConfig = {
    "kind": "categoryToolbox",
    "contents": [
        {
            "kind": "category",
            "name": "Основные",
            "colour": "%{BKY_LOGIC_HUE}",
            "contents": [
                {
                    "kind": "block",
                    "type": "controls_if"
                },
                {
                    "kind": "block",
                    "type": "controls_ifelse",
                },
                {
                    "kind": "block",
                    "type": "logic_compare"
                },
                {
                    "kind": "block",
                    "type": "logic_operation"
                },
                {
                    "kind": "block",
                    "type": "math_number"
                },
                {
                    "kind": "block",
                    "type": "math_arithmetic"
                },
                {
                    "kind": "block",
                    "type": "math_modulo"
                },
                // {
                //     "kind:": "block",
                //     "type": "variables_set",
                //     "message0": "%{BKY_VARIABLES_SET}",
                //     "args0": [
                //         {
                //         "type": "field_variable",
                //         "name": "VAR",
                //         "variable": "pppp"
                //         },
                //         {
                //         "type": "input_value",    // This expects an input of any type
                //         "name": "VALUE"
                //         }
                //     ],
                // }
            ]
        },
        {
            "kind": "category",
            "name": "Переменные",
            "colour": "%{BKY_VARIABLES_HUE}",
            "custom": "VARIABLE",
        },
        {
            "kind": "category",
            "name": "Функции",
            "colour": "%{BKY_PROCEDURES_HUE}",
            "custom": "PROCEDURE"
        }
        // {
        //     "type": "example_variable_untyped",
        //     "message0": "variable: %1",
        //     "args0": [
        //         {
        //             "type": "field_variable",
        //             "name": "FIELDNAME",
        //             "variable": "x"
        //         }
        //     ]
        // }
    ]
}
export class Luckytickets implements KioTask {
    public settings: KioTaskSettings;
    private kioapi: KioApi;
    private domNode: HTMLElement;
    private storedInput = '';
    private linesCount = 1;
    private linesArray = [1];
    private blockly = Blockly;

    private complexExpressionTree: BaseToken = {
        operation: '',
        operands: []
    };

    constructor(settings: KioTaskSettings) {
        this.settings = settings;
    }

    id() {
        return "luckytickets" + this.settings.level;
    }

    initialize(domNode: HTMLElement, kioapi: KioApi, preferred_width: number) {

        this.kioapi = kioapi;
        this.domNode = domNode;

        const ticketsContainer = document.createElement('div');
        ticketsContainer.className = 'tickets-container';
        this.domNode.appendChild(ticketsContainer);

        const inputTicketContainer = document.createElement('div');
        inputTicketContainer.className = 'input-ticket-container';

        const inputTicketTitle = document.createElement('div');
        inputTicketTitle.className = 'input-ticket-title';
        inputTicketTitle.innerText = 'Текущий номер\nбилета';
        inputTicketContainer.appendChild(inputTicketTitle);

        const inputTicketImage = document.createElement('form');
        inputTicketImage.className = 'input-ticket-image';
        inputTicketImage.innerHTML = '<input maxlength="6" class="input-number" placeholder="abcdef" type="text">';
        inputTicketContainer.appendChild(inputTicketImage);
        var elem = document.createElement('div');
        elem.id = 'notify';
        elem.style.display = 'none';

        inputTicketImage.appendChild(elem);
        inputTicketImage.addEventListener('input', (event: InputEvent) => {
            if (event?.data) {
                if (this.validInput(event)) {
                    this.storedInput = (<HTMLInputElement>event.target).value;
                    inputTicketImage.classList.remove('invalid');
                    elem.style.display = 'none';
                } else {
                    inputTicketImage.classList.add('invalid');
                    elem.textContent = 'Номер билета должен быть шестизначным числом';
                    elem.className = 'error';
                    elem.style.display = 'block';
                }
            } else if (this.validInput(event)) {
                inputTicketImage.classList.remove('invalid');
                elem.style.display = 'none';
            }
        });

        ticketsContainer.appendChild(inputTicketContainer);

        const outputTicketContainer = document.createElement('div');
        outputTicketContainer.className = 'output-ticket-container';

        const outputTicketTitle = document.createElement('div');
        outputTicketTitle.className = 'output-ticket-title';
        outputTicketTitle.innerText = 'Пользовательский\nответ';
        outputTicketContainer.appendChild(outputTicketTitle);

        const outputTicketImage = document.createElement('div');
        outputTicketImage.className = 'output-ticket-image';
        outputTicketImage.innerHTML = '<input disabled class="output-number" id="output-field" placeholder="uvwxyz">';
        outputTicketContainer.appendChild(outputTicketImage);

        ticketsContainer.appendChild(outputTicketContainer);


        const rightOutputTicketContainer = document.createElement('div');
        rightOutputTicketContainer.className = 'rightOutput-ticket-container';

        const rightOutputTicketTitle = document.createElement('div');
        rightOutputTicketTitle.className = 'rightOutput-ticket-title';
        rightOutputTicketTitle.innerText = 'Правильный\nответ';
        rightOutputTicketContainer.appendChild(rightOutputTicketTitle);

        const rightOutputTicketImage = document.createElement('div');
        rightOutputTicketImage.className = 'rightOutput-ticket-image';
        rightOutputTicketImage.innerHTML = '<input disabled class="rightOutput-number" id="rightOutput-field" placeholder="uvwxyz">';
        rightOutputTicketContainer.appendChild(rightOutputTicketImage);

        ticketsContainer.appendChild(rightOutputTicketContainer);

        // const codeEditor = document.createElement('div');
        // codeEditor.className = 'code-editor';
        // codeEditor.innerHTML = '<div class="code-editor-header" id="code-editor-header-id"></div><div class="code-lines" id="ruler"></div><textarea id="text-from-editor"></textarea>';

        // this.domNode.appendChild(codeEditor);

        // const infoIcon = document.createElement('div');
        // infoIcon.className = 'info-icon';
        // const editorHeader = document.getElementById('code-editor-header-id');
        // editorHeader.appendChild(infoIcon);

        // const editorElement = <HTMLTextAreaElement>document.getElementById('text-from-editor');

        // if (editorElement) {
        //     const ruler = document.getElementById('ruler');
        //     ruler.innerHTML = `<div class="line-number" id="${this.linesArray[0].toString()}">${this.linesArray[0].toString()}</div>`;
        // }
        // editorElement.addEventListener('keydown', (event) => {
        //     if (editorElement?.value) {
        //         this.updateRuler(editorElement.value);
        //     }
        // });

        const blocklyContainer = document.createElement('div');
        blocklyContainer.className = 'code-editor';

        const blocklyEditor = document.createElement('div');
        blocklyEditor.id = 'blocklyDiv';
        blocklyContainer.appendChild(blocklyEditor);
        this.domNode.appendChild(blocklyContainer);

        const workspace = Blockly.inject('blocklyDiv',
            {
                toolbox: ToolboxConfig,
                media: 'luckytickets-resources/'
            });
        const lang = 'JavaScript';
        workspace.createVariable('a')
        workspace.createVariable('b');
        workspace.createVariable('c');
        workspace.createVariable('d');
        workspace.createVariable('e');
        workspace.createVariable('f');
        workspace.createVariable('result');
        workspace.createVariable('u');
        workspace.createVariable('v');
        workspace.createVariable('w');
        workspace.createVariable('x');
        workspace.createVariable('y');
        workspace.createVariable('z');
        // const button = document.getElementById('blocklyButton');
        // button.addEventListener('click', function () {
        //     alert("Check the console for the generated output.");
        //     const code = (Blockly as any)[lang].workspaceToCode(workspace);
        //     console.log(code);
        // })

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';
        this.domNode.appendChild(buttonsContainer);

        const stepPlusButton = document.createElement('button');
        stepPlusButton.className = 'step-plus-button';
        stepPlusButton.innerText = 'СПРАВКА';
        buttonsContainer.appendChild(stepPlusButton);
        stepPlusButton.addEventListener('click', (event) => {
            window.alert("Данный веб-сайт предназначен для решения участниками\
олимпиады задачи о написании алгоритма поиска следующего счастливого билета.\n\
Для написания алгоритма участникам предлагается набор функций, которые необходимо \
расположить в рабочей области (справа). Номер билета задается через переменные \
a, b, c, d, e, f посимвольно, так что пользователю нужно работать именно с ними. \
Итоговый результат работы алгоритма (номер следующего счастливого билета) можно сохранять \
как посимвольно (в переменные u, v, w, x, y, z), так и как целое число в переменную result.\n\n\
МГНОВЕННЫЙ РЕЗУЛЬТАТ: после ввода в графу 'Текущий номер билета' выводит результат работы \
пользовательского алгоритма и правильный номер следующего счастливого билета.\n\nПОКАЗАТЬ КОД: \
показывает текущий алгоритм пользователя, преобразованный в код на JavaScript, для лучшего \
понимания участниками олимпиады, изучающими программирование, условие задания. Код в любое \
время можно скопировать из консоли разработчика (Google Chrome: F12, console).\n\nНажмите ОК, \
чтобы продолжить");
            window.alert("ЗАПУСК: запускает алгоритм проверки результатов работы пользовательского \
алгоритма. Результат проверяется на 10000 случайных номерах. В случае некорректности \
алгоритма, уведомляет пользователя и останавливается на номере, где алгоритм сработал неверно. \
В случае успешного прохождения проверки, уведомляет пользователя и сообщает об эффективности \
алгоритма, рассчитаного по формуле: ((3000*7)/(длина алгоритма пользователя, преобразованная в \
JS, в символах* количество условий 'если' в преобразованном коде))*100. Числа подобраны таким \
образом, поскольку алгоритм авторов имеет примерно 3000 символов и 7 условий if, таким образом, \
получает оценку эффективности 100. Однако предел эффективности еще предстоит исследовать участникам олимпиады.\n\n\
Кнопки в нижней части страницы работают только при подключении к серверу, однако версия сайта тестовая и еще не \
опубликована.")
        });

        const instantResultButton = document.createElement('button');
        instantResultButton.innerText = 'МГНОВЕННЫЙ РЕЗУЛЬТАТ';
        instantResultButton.className = 'instant-result-button';
        buttonsContainer.appendChild(instantResultButton);
        instantResultButton.addEventListener('click', (event) => {
            var UserResult, ticket;
            var set_function = 'function UserTicket(ticket) {\n'
            var setting_variables = 'var a, b, c, d, e, f, result;'
            var setting_a = 'a = (ticket % 1000000 - ticket % 100000) / 100000;'
            var setting_b = 'b = (ticket % 100000 - ticket % 10000) / 10000;'
            var setting_c = 'c = (ticket % 10000 - ticket % 1000) / 1000;'
            var setting_d = 'd = (ticket % 1000 - ticket % 100) / 100;'
            var setting_e = 'e = (ticket % 100 - ticket % 10) / 10;'
            var setting_f = 'f = (ticket % 10 - ticket % 1);'
            var code = set_function + '\n' + setting_variables + '\n' + setting_a + '\n' + setting_b + '\n' + setting_c + '\n' + setting_d + '\n' + setting_e + '\n' + setting_f + '\n';
            code += (Blockly as any).JavaScript.workspaceToCode(workspace);
            code += '\nreturn result;\n}\n\n';
            code += 'UserResult = UserTicket(ticket);'
            let input = document.querySelector('input');
            ticket = input.value;
            const outputField = <HTMLInputElement>document.getElementById('output-field');
            const rightOutputField = <HTMLInputElement>document.getElementById('rightOutput-field');
            try {
                eval(code);
                if (UserResult == nextTicket(input.value)) {
                    outputField.style.color = "green"
                }
                else {
                    outputField.style.color = "#ff9999"
                }
            } catch (e) {
                alert(e);
            }
            if (UserResult) {
                outputField.value = ('000000' + UserResult).slice(-6);
            }
            rightOutputField.value = ('000000' + nextTicket(input.value)).slice(-6);
            if (!input.value)
                input.value = '000000'
        });

        const stepMinusButton = document.createElement('button');
        stepMinusButton.innerText = 'КОД АЛГОРИТМА';
        stepMinusButton.className = 'step-minus-button';
        buttonsContainer.appendChild(stepMinusButton);
        stepMinusButton.addEventListener('click', (event) => {
        });


        const demoButton = document.createElement('button');
        demoButton.innerText = 'ЗАПУСК';
        demoButton.className = 'demo-button';
        buttonsContainer.appendChild(demoButton);

        function exportBlocks() {
            try {
                var xml = Blockly.Xml.workspaceToDom(workspace);
                var xml_text = Blockly.Xml.domToText(xml);

                var link = document.createElement('a');
                link.download = "project.txt";
                link.href = "data:application/octet-stream;utf-8," + encodeURIComponent(xml_text);
                document.body.appendChild(link);
                link.click();
                link.remove();
            } catch (e) {
                window.location.href = "data:application/octet-stream;utf-8," + encodeURIComponent(xml_text);
                alert(e);
            }
        }

        function importBlocks() {
            try {
                var xml_text = prompt("Please enter XML code", "");
                var xml = Blockly.Xml.textToDom(xml_text);
                workspace.clear();
                Blockly.Xml.domToWorkspace(xml, workspace);
            } catch (e) {
                alert(e);
            }
        }

        function importBlocksFile(element) {
            try {
                var file = element.files[0];
                var fr = new FileReader();
                fr.onload = function (event) {
                    var xml = Blockly.Xml.textToDom(<string>event.target.result);
                    workspace.clear();
                    Blockly.Xml.domToWorkspace(xml, workspace);
                };
                fr.readAsText(file);
            } catch (e) {
                alert(e);
            }
        }

        stepMinusButton.addEventListener('click', (event) => {
            var set_function = 'function UserTicket(ticket) {\n'
            var setting_variables = 'var a, b, c, d, e, f, result, x = 0, y = 0, z = 0, u = 0, v = 0, w = 0;'
            var setting_a = 'a = (ticket % 1000000 - ticket % 100000) / 100000;'
            var setting_b = 'b = (ticket % 100000 - ticket % 10000) / 10000;'
            var setting_c = 'c = (ticket % 10000 - ticket % 1000) / 1000;'
            var setting_d = 'd = (ticket % 1000 - ticket % 100) / 100;'
            var setting_e = 'e = (ticket % 100 - ticket % 10) / 10;'
            var setting_f = 'f = (ticket % 10 - ticket % 1);'
            var code = set_function + '\n' + setting_variables + '\n' + setting_a + '\n' + setting_b + '\n' + setting_c + '\n' + setting_d + '\n' + setting_e + '\n' + setting_f + '\n';
            code += (Blockly as any).JavaScript.workspaceToCode(workspace);
            code += 'if(!result) {\nresult = String(u) + String(v) + String(w) + String(x) + String(y) + String(z)\n}'
            code += '\nreturn result;\n}\n\n';
            code += 'UserResult = UserTicket(ticket);'
            console.log(code);
            alert(code);
        })

        demoButton.addEventListener('click', (event) => {
            if (!(Blockly as any).JavaScript.workspaceToCode(workspace)) {
                window.alert("Алгоритм не написан!");
            }
            else {
                var UserResult, ticket, CountRight = 0;
                var set_function = 'function UserTicket(ticket) {\n'
                var setting_variables = 'var a, b, c, d, e, f, result, x = 0, y = 0, z = 0, u = 0, v = 0, w = 0;'
                var setting_a = 'a = (ticket % 1000000 - ticket % 100000) / 100000;'
                var setting_b = 'b = (ticket % 100000 - ticket % 10000) / 10000;'
                var setting_c = 'c = (ticket % 10000 - ticket % 1000) / 1000;'
                var setting_d = 'd = (ticket % 1000 - ticket % 100) / 100;'
                var setting_e = 'e = (ticket % 100 - ticket % 10) / 10;'
                var setting_f = 'f = (ticket % 10 - ticket % 1);'
                var code = set_function + '\n' + setting_variables + '\n' + setting_a + '\n' + setting_b + '\n' + setting_c + '\n' + setting_d + '\n' + setting_e + '\n' + setting_f + '\n';
                code += (Blockly as any).JavaScript.workspaceToCode(workspace);
                code += 'if(!result) {\nresult = String(u) + String(v) + String(w) + String(x) + String(y) + String(z)\n}'
                code += '\nreturn result;\n}\n\n';
                code += 'UserResult = UserTicket(ticket);'
                let input = document.querySelector('input');
                ticket = input.value;
                const outputField = <HTMLInputElement>document.getElementById('output-field');
                const rightOutputField = <HTMLInputElement>document.getElementById('rightOutput-field');
                try {
                    eval(code);
                    if (UserResult == nextTicket(input.value)) {
                        outputField.style.color = "green"
                    }
                    else {
                        outputField.style.color = "#ff9999"
                    }
                } catch (e) {
                    alert(e);
                }
                if (UserResult) {
                    outputField.value = ('000000' + UserResult).slice(-6);
                }
                rightOutputField.value = ('000000' + nextTicket(input.value)).slice(-6);
                if (!input.value)
                    input.value = '000000'
                let IfCount = (code.split("if").length - 1) - 1;
                    if (IfCount == 0) {
                        let Efficiency = (2100000 / (code.length-503)) / 1
                    }
                let Efficiency = (2100000 / (code.length-503)) / IfCount
                for (var i = 0; i < 10001; i++) {
                    ticket = Math.floor(Math.random() * 999998);
                    input.value = ('000000' + ticket).slice(-6);
                    try {
                        eval(code);
                    } catch (e) {
                        alert(e);
                    }
                    if (UserResult != nextTicket(ticket)) {
                        outputField.style.color = "#ff9999"
                        if (!UserResult) {
                            UserResult = 0;
                        }
                        outputField.value = ('000000' + UserResult).slice(-6);
                        rightOutputField.value = ('000000' + nextTicket(input.value)).slice(-6);
                        window.alert("Алгоритм работает неверно!");
                        this.history_updated(IfCount, (code.length-503), '0');
                        break;
                    }
                    else {
                        CountRight++
                    }
                }
                if (CountRight == 10001) {
                    window.alert("Алгоритм работает верно! Эффективность алгоритма =" + Efficiency);
                    this.history_updated(IfCount, (code.length-503), Efficiency);
                }    
            }
            // document.getElementById('textarea').value = code;
            // var myblocks = (Blockly as any).mainWorkspace.getAllBlocks();
            // for (var i=0; i<myblocks.length; i++){
            //     console.log(myblocks[i].getFieldValue('fieldName'));
            // }
            // if (editorElement?.value) {
            //     const rawDataArray = this.splitLines(editorElement.value);
            //     console.log('RAW DATA', rawDataArray);
            //     const jsFunctionString = this.constructJSFunction(rawDataArray);
            //     console.log('PROCESSED DATA', jsFunctionString);
            //     this.callJSFunction(jsFunctionString);
            // }
        });

        const animationButton = document.createElement('button');
        animationButton.innerText = 'АНИМАЦИЯ ПЕРЕБОРА';
        animationButton.className = 'animation-button';
        buttonsContainer.appendChild(animationButton);
        animationButton.addEventListener('click', (event) => {
        });
        function nextTicket(ticket: any) {
            function positive(ticket: any) {
                let a = (ticket % 1000000 - ticket % 100000) / 100000;
                let b = (ticket % 100000 - ticket % 10000) / 10000;
                let c = (ticket % 10000 - ticket % 1000) / 1000;
                let d = (ticket % 1000 - ticket % 100) / 100;
                let e = (ticket % 100 - ticket % 10) / 10;
                let f = (ticket % 10 - ticket % 1);
                let s1 = a + b + c;
                let s2 = d + e + f;
                let diff = s1 - s2;
                if (9 - f >= diff) {
                    f += diff;
                }
                else if (18 - f - e >= diff) {
                    e += diff - 9 + f;
                    f = 9;
                }
                else {
                    d += diff - 18 + e + f;
                    e = 9;
                    f = 9;
                }
                let key = String(a) + String(b) + String(c) + String(d) + String(e) + String(f);
                return (key);
            }

            function negative(ticket: any) {
                let a = (ticket % 1000000 - ticket % 100000) / 100000;
                let b = (ticket % 100000 - ticket % 10000) / 10000;
                let c = (ticket % 10000 - ticket % 1000) / 1000;
                let d = (ticket % 1000 - ticket % 100) / 100;
                let e = (ticket % 100 - ticket % 10) / 10;
                let f = (ticket % 10 - ticket % 1);
                let s1 = a + b + c;
                let s2 = d + e + f;
                let diff = s2 - s1;
                let key;
                if ((diff <= f - 1) && (e != 9)) {
                    f = f - diff - 1;
                    e += 1;
                }
                else if ((diff <= f + e - 1) && (d != 9)) {
                    d += 1;
                    diff = (diff - f - e + 1) * -1;
                    if (diff > 9) {
                        f = 9;
                        e = diff - f;
                    }
                    else {
                        f = diff;
                        e = 0;
                    }
                }
                else {
                    ticket += 1000 - 100 * d - 10 * e - f;
                    key = positive(ticket);
                }
                if (!key) {
                    key = String(a) + String(b) + String(c) + String(d) + String(e) + String(f);
                }
                return (key);
            }
            ticket = Number(ticket) + 1;
            let a = (ticket % 1000000 - ticket % 100000) / 100000;
            let b = (ticket % 100000 - ticket % 10000) / 10000;
            let c = (ticket % 10000 - ticket % 1000) / 1000;
            let d = (ticket % 1000 - ticket % 100) / 100;
            let e = (ticket % 100 - ticket % 10) / 10;
            let f = (ticket % 10 - ticket % 1);
            let s1 = a + b + c;
            let s2 = d + e + f;
            let diff = s1 - s2;
            let key;
            if (diff < 0) {
                key = negative(ticket);
            }
            else {

                key = positive(ticket);
            }
            return (key);
        }
    }

    private validInput(ticketNumber: InputEvent): boolean {
        // Has to be number
        // Has to be within the range
        // Has to be different numbers depending on number system
        const inputValue = (<HTMLInputElement>ticketNumber.target).value;
        return inputValue && Number.isInteger(+inputValue) && /^\d+$/.test(inputValue) || !inputValue;
    }

    private updateRuler(value: string): void {
        const ruler = document.getElementById('ruler');
        const lines = value.split(/\r*\n/);
        this.linesCount = lines.length;

        if (this.linesArray[this.linesArray.length - 1] === this.linesCount) {
            return;
        } else if (this.linesCount < this.linesArray[this.linesArray.length - 1]) {
            ruler.removeChild(ruler.lastChild);
            this.linesArray.pop();
            return;
        }
        this.linesArray.push(this.linesCount);
        const elem = document.createElement("div");
        elem.setAttribute('id', this.linesCount.toString());
        elem.className = 'line-number';
        elem.innerText = this.linesCount.toString();
        ruler.appendChild(elem);
    }

    private splitLines(editorValue: string): string[] {
        return editorValue.split(/\r*\n/);
    }

    private constructJSFunction(rawDataArray: string[]): string {
        return this.processRawData(rawDataArray).join('');
    }

    private processRawData(rawDataArray: string[]): string[] {
        const processedData: string[] = [];
        rawDataArray.forEach((rawLine) => {
            const conditionExpression: ConditionExpression = this.buildCondition(rawLine);
            const compareExpression: CompareExpression = this.buildCompare(conditionExpression);

            let decomposedLeft: any;
            if (this.codeContainsOperator(compareExpression.left)) {
                this.initTree();
                this.keepDecomposing(compareExpression.left);
                decomposedLeft = Object.assign({}, this.complexExpressionTree);
            } else {
                decomposedLeft = compareExpression.left;
            }

            let decomposedRight: any;
            if (this.codeContainsOperator(compareExpression.right)) {
                this.initTree();
                this.keepDecomposing(compareExpression.right);
                decomposedRight = this.complexExpressionTree;
            } else {
                decomposedRight = Object.assign({}, compareExpression.right);
            }

            const jsLine = this.constructJSLine(conditionExpression, compareExpression, decomposedLeft, decomposedRight);
            processedData.push(jsLine);
        });
        return processedData;
    }

    private initTree() {
        this.complexExpressionTree.operation = '';
        this.complexExpressionTree.operands = [];
    }

    private keepDecomposing(rawExpression: string, currentIndex?: number, parentIndex?: number) {
        const lineWithoutSpaces = rawExpression.split(' ').join('');
        if (lineWithoutSpaces.includes(OperatorsList.PLUS)) {
            this.buildTree(lineWithoutSpaces, MathOperations.sum, parentIndex, currentIndex);
        } else if (lineWithoutSpaces.includes(OperatorsList.MINUS)) {
            this.buildTree(lineWithoutSpaces, MathOperations.subtr, parentIndex, currentIndex);
        } else if (lineWithoutSpaces.includes(OperatorsList.MULT)) {
            this.buildTree(lineWithoutSpaces, MathOperations.mult, parentIndex, currentIndex);
        } else if (lineWithoutSpaces.includes(OperatorsList.DIVISION)) {
            this.buildTree(lineWithoutSpaces, MathOperations.division, parentIndex, currentIndex);
        } else if (lineWithoutSpaces.includes(OperatorsList.POW)) {
            this.buildTree(lineWithoutSpaces, MathOperations.power, parentIndex, currentIndex);
        }
    }

    private buildTree(lineWithoutSpaces: string, mathOperator: MathOperator, parentIndex: number, currentIndex: number) {
        const operands = this.findOperands(lineWithoutSpaces, mathOperator.userOperator);
        if (parentIndex === undefined && currentIndex === undefined) {
            this.complexExpressionTree = {
                operation: mathOperator.operation,
                operands
            }
            operands.forEach((operand, index) => {
                if (this.codeContainsOperator(operand)) {
                    this.keepDecomposing(operand, index);
                }
            });
        } else if (currentIndex !== undefined && parentIndex === undefined) {
            this.complexExpressionTree.operands[currentIndex] = {
                operation: mathOperator.operation,
                operands
            }
            operands.forEach((operand, index) => {
                if (this.codeContainsOperator(operand)) {
                    this.keepDecomposing(operand, index, currentIndex);
                }
            });
        } else if (parentIndex !== undefined && currentIndex !== undefined) {
            this.complexExpressionTree.operands[parentIndex].operands[currentIndex] = {
                operation: mathOperator.operation,
                operands
            }
            operands.forEach((operand, index) => {
                if (this.codeContainsOperator(operand)) {
                    this.keepDecomposing(operand, index, parentIndex);
                }
            });
        }
    }

    private constructJSLine(conditionExpression: ConditionExpression, compareExpression: CompareExpression, decomposedLeft: BaseToken, decomposedRight: BaseToken): string {
        const leftExpression = this.constructExpression(decomposedLeft);
        const rightExpression = this.constructExpression(decomposedRight);
        let constructedLine = '';
        if (conditionExpression.condition === 'if') {
            constructedLine = `${conditionExpression.condition}(${leftExpression}${compareExpression.comparator}${rightExpression})`;
        } else if (conditionExpression.condition === 'then') {
            constructedLine = `{${leftExpression}${compareExpression.comparator}${rightExpression}}`;
        } else if (conditionExpression.condition === 'else') {
            constructedLine = `${conditionExpression.condition}{${leftExpression}${compareExpression.comparator}${rightExpression}}`;
        }
        return constructedLine;
    }

    private constructExpression(exprTree: any): string {
        let expr = '';
        if (typeof exprTree === 'string') {
            return expr = exprTree;
        } else if (exprTree?.operands && exprTree.operands.every((operand: any) => {
            return typeof operand === 'string';
        })) {
            return expr = `(${exprTree.operands.join(this.getJSOperator(exprTree.operation))})`;
        } else if (exprTree?.operands) {
            exprTree.operands.forEach((entry: any) => {
                const operatorNeeded = expr.length > 0 ? this.getJSOperator(exprTree.operation) : '';
                expr += operatorNeeded + this.constructExpression(entry);
            });
            return `(${expr})`;
        }
    }

    private getJSOperator(operation: string): string {
        return MathOperations[operation.toLowerCase()].jsOperator;
    }

    private codeContainsOperator(codeLine: string): boolean {
        const hasOperand = codeLine.includes(OperatorsList.PLUS) ||
            codeLine.includes(OperatorsList.MINUS) ||
            codeLine.includes(OperatorsList.MULT) ||
            codeLine.includes(OperatorsList.DIVISION) ||
            codeLine.includes(OperatorsList.POW);
        return hasOperand;
    }

    private buildCondition(codeLine: string): ConditionExpression {
        const conditionExpression = {
            condition: '',
            expression: ''
        }
        if (codeLine.includes(OperatorsList.IF)) {
            conditionExpression.condition = 'if';
            conditionExpression.expression = codeLine.substring(OperatorsList.IF.length);
        } else if (codeLine.includes(OperatorsList.ELSE)) {
            conditionExpression.condition = 'else';
            conditionExpression.expression = codeLine.substring(OperatorsList.ELSE.length);
        } else if (codeLine.includes(OperatorsList.THEN)) {
            conditionExpression.condition = 'then';
            conditionExpression.expression = codeLine.substring(OperatorsList.THEN.length);
        }
        return conditionExpression;
    }

    private buildCompare(codeLine: ConditionExpression): CompareExpression {
        const decomposedLine = {
            comparator: '',
            left: '',
            right: ''
        }

        if (codeLine.expression.includes(OperatorsList.EQUALS)) {
            if (codeLine.condition === 'if') {
                decomposedLine.comparator = '===';
            } else if (codeLine.condition === 'else' || codeLine.condition === 'then') {
                decomposedLine.comparator = '=';
            }
            decomposedLine.left = codeLine.expression.split(OperatorsList.EQUALS)[0];
            decomposedLine.right = codeLine.expression.split(OperatorsList.EQUALS)[1];
        } else if (codeLine.expression.includes(OperatorsList.LT)) {
            decomposedLine.comparator = '<';
            decomposedLine.left = codeLine.expression.split(OperatorsList.LT)[0];
            decomposedLine.right = codeLine.expression.split(OperatorsList.LT)[1];
        } else if (codeLine.expression.includes(OperatorsList.LTE)) {
            decomposedLine.comparator = '<=';
            decomposedLine.left = codeLine.expression.split(OperatorsList.LTE)[0];
            decomposedLine.right = codeLine.expression.split(OperatorsList.LTE)[1];
        } else if (codeLine.expression.includes(OperatorsList.GT)) {
            decomposedLine.comparator = '>';
            decomposedLine.left = codeLine.expression.split(OperatorsList.GT)[0];
            decomposedLine.right = codeLine.expression.split(OperatorsList.GT)[1];
        } else if (codeLine.expression.includes(OperatorsList.GTE)) {
            decomposedLine.comparator = '>=';
            decomposedLine.left = codeLine.expression.split(OperatorsList.GTE)[0];
            decomposedLine.right = codeLine.expression.split(OperatorsList.GTE)[1];
        }
        return decomposedLine;
    }

    private findOperands(lineWithoutSpaces: string, operator: string): string[] {
        const tokens: string[] = [];
        const arrayWithoutOperand = lineWithoutSpaces.split(operator);
        arrayWithoutOperand.forEach((operand) => {
            tokens.push(operand);
        });
        return tokens;
    }

    private callJSFunction(jsString: string): void {
        console.log('STORED INPUT', this.storedInput);
        const a = +this.storedInput[0];
        const b = +this.storedInput[1];
        const c = +this.storedInput[2];
        const d = +this.storedInput[3];
        const e = +this.storedInput[4];
        const f = +this.storedInput[5];
        const vars = `const a = ${a};const b = ${b};const c = ${c};const d = ${d};const e = ${e};const f = ${f};let x = undefined;`
        const funcWithVars = vars.concat(jsString);
        const funcWithFunc = `function calculateLuckyTicket(){${funcWithVars}return x}; calculateLuckyTicket();`
        const calculatedValue = eval(funcWithFunc);
        console.log('Calculated Value', calculatedValue);
    }

    parameters(): KioParameterDescription[] {
        return [
            {
                name: "Ifs",
                title: "Количество 'если': ",
                ordering: 'maximize',
                view: function (val) {
                    return '' + val
                },
            },
            {
                name: "CodeLength",
                title: "Длина кода: ",
                ordering: 'minimize',
                view: function (val) {
                    return '' + val
                }
            },
            {
                name: "Efficiency",
                title: "Эффективность: ",
                ordering: 'minimize',
                view: function (val) {
                    return '' + val
                }
            }
        ];
    }
    history_updated(IfCount, CodeLength, Efficiency) {
        this.kioapi.submitResult({
            "Ifs": IfCount,
            "CodeLength": CodeLength,
            "Efficiency": Efficiency,
        });
    }
    /*static preloadManifest(): KioResourceDescription[] {
        return [
            {id: "1", src: "collatz_es_next-resources/collatz_conjecture.png"}
        ];
    };*/

    solution(): Solution {
        return {};
    };

    loadSolution(solution: Solution): void {
    }
}

interface Solution {
}

