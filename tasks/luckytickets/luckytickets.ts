import './luckytickets.scss'
import {KioApi, KioTask, KioParameterDescription, KioResourceDescription, KioTaskSettings} from "../KioApi";
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
            "name": "Заданные переменные",
            "colour": "Green",
            "contents": [
                // {
                //     'kind': 'block',
                //     'type': 'variables_set'
                // },
                // {
                //     'kind': 'block',
                //     'type': 'variables_get'
                // },
                {
                    'kind': 'block',
                    "type": "variables_set",
                    "message0": "%{BKY_VARIABLES_SET}",
                    "args0": [
                        {
                            'type': 'field_variable',
                            'name': 'VAR',
                            'variable': '%{BKY_VARIABLES_DEFAULT_NAME}',
                        },
                        {
                            'type': 'input_value',
                            'name': 'VALUE',
                        },
                    ],
                }
            ]
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
    private settings: KioTaskSettings;
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
        console.log('preferred width in problem initialization', preferred_width);

        this.kioapi = kioapi;
        this.domNode = domNode;

        console.log('problem level is', this.settings.level);
        const ticketsContainer = document.createElement('div');
        ticketsContainer.className = 'tickets-container';
        this.domNode.appendChild(ticketsContainer);

        const inputTicketContainer = document.createElement('div');
        inputTicketContainer.className = 'input-ticket-container';

        const inputTicketTitle = document.createElement('div');
        inputTicketTitle.className = 'input-ticket-title';
        inputTicketTitle.innerText = 'Текущий номер билета';
        inputTicketContainer.appendChild(inputTicketTitle);

        const inputTicketImage = document.createElement('form');
        inputTicketImage.className = 'input-ticket-image';
        inputTicketImage.innerHTML = '<input maxlength="6" class="input-number" placeholder="abcdef">';
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
                    elem.textContent   = 'Номер билета должен быть шестизначным числом';
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
        outputTicketTitle.innerText = 'Следующий счастливый билет';
        outputTicketContainer.appendChild(outputTicketTitle);

        const outputTicketImage = document.createElement('div');
        outputTicketImage.className = 'output-ticket-image';
        outputTicketImage.innerHTML = '<input disabled class="output-number" id="output-field" placeholder="xyzuvw">';
        outputTicketContainer.appendChild(outputTicketImage);

        ticketsContainer.appendChild(outputTicketContainer);

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
        // const button = document.getElementById('blocklyButton');
        // button.addEventListener('click', function () {
        //     alert("Check the console for the generated output.");
        //     const code = (Blockly as any)[lang].workspaceToCode(workspace);
        //     console.log(code);
        // })

        (Blockly as any).Blocks['string_length'] = {
            init: function() {
              this.appendValueInput('VALUE')
                  .setCheck('String')
                  .appendField('length of');
              this.setOutput(true, 'Number');
              this.setColour(160);
              this.setTooltip('Returns number of letters in the provided text.');
              this.setHelpUrl('http://www.w3schools.com/jsref/jsref_length_string.asp');
            }
        };

        workspace.newBlock('string_length');
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';
        this.domNode.appendChild(buttonsContainer);

        const stepPlusButton = document.createElement('button');
        stepPlusButton.className = 'step-plus-button';
        stepPlusButton.innerText = 'СЛЕДУЮЩАЯ ОШИБКА';
        buttonsContainer.appendChild(stepPlusButton);
        stepPlusButton.addEventListener('click', (event) => {
        });

        const instantResultButton = document.createElement('button');
        instantResultButton.innerText = 'МГНОВЕННЫЙ РЕЗУЛЬТАТ';
        instantResultButton.className = 'instant-result-button';
        buttonsContainer.appendChild(instantResultButton);
        instantResultButton.addEventListener('click', (event) => {
            if (this.storedInput?.length) {
                const outputField = <HTMLInputElement>document.getElementById('output-field');
                if (outputField) {
                    outputField.value = this.storedInput;
                }
            }
        });

        const stepMinusButton = document.createElement('button');
        stepMinusButton.innerText = 'ПРЕДЫДУЩАЯ ОШИБКА';
        stepMinusButton.className = 'step-minus-button';
        buttonsContainer.appendChild(stepMinusButton);
        stepMinusButton.addEventListener('click', (event) => {
        });


        const demoButton = document.createElement('button');
        demoButton.innerText = 'ЗАПУСК';
        demoButton.className = 'demo-button';
        buttonsContainer.appendChild(demoButton);

        (Blockly as any).Blocks['generic_block'] = {
            init: function() {
              this.jsonInit({
                message0: '',
                colour: '230'
              });
            }
          };
          var lineBlock = workspace.newBlock('generic_block');         // create new instance of generic block
          var input = lineBlock.appendDummyInput();                               // create a dummy input
          var blockText="Hello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s World";                                       // one line of the JS code
          var currentLine = blockText.split(/(%s)/);                            // split every word
          for( var y = 0; y < currentLine.length; y++ ) {                       // loop through each word
              if(currentLine[y]==='%s') {                                         // if the word is %s, then append input field
                  input.appendField(new Blockly.FieldTextInput('input'+y));         // input+y is the name of the field
              } else {                                                                         // else just append label field
                  var labelField = new (Blockly as any).FieldLabel('label'+y);                         // label+y is the name of the field
                  labelField.setValue(currentLine[y]);                                          // set the label value to the word
                  input.appendField(labelField)
              }
          }
        demoButton.addEventListener('click', () => {
            var lineBlock = workspace.newBlock('generic_block');         // create new instance of generic block
            var input=lineBlock.appendDummyInput();                               // create a dummy input
            var blockText="Hello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s WorldHello %s World";                                       // one line of the JS code
            var currentLine = blockText.split(/(%s)/);                            // split every word
            for( var y = 0; y < currentLine.length; y++ ) {                       // loop through each word
                if(currentLine[y]==='%s') {                                         // if the word is %s, then append input field
                    input.appendField(new Blockly.FieldTextInput('input'+y));         // input+y is the name of the field
                } else {                                                                         // else just append label field
                    var labelField = new (Blockly as any).FieldLabel('label'+y);                         // label+y is the name of the field
                    labelField.setValue(currentLine[y]);                                          // set the label value to the word
                    input.appendField(labelField)
                }
            }
            // var code = (Blockly as any).JavaScript.workspaceToCode(workspace);
            // console.log(code);
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

        var parentBlock = workspace.newBlock('text_print');
        parentBlock.initSvg();
        parentBlock.render();

        var childBlock = workspace.newBlock('text');

        childBlock.setFieldValue('Hello', 'TEXT');
        childBlock.initSvg();
        childBlock.render();

        var parentConnection = parentBlock.getInput('TEXT').connection;
        var childConnection = childBlock.outputConnection;
        parentConnection.connect(childConnection);

        const animationButton = document.createElement('button');
        animationButton.innerText = 'АНИМАЦИЯ ПЕРЕБОРА';
        animationButton.className = 'animation-button';
        buttonsContainer.appendChild(animationButton);
        animationButton.addEventListener('click', (event) => {
        });
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
                name: "steps",
                title: "Количество шагов",
                ordering: 'maximize',
                view: "ш"
            },
            {
                name: "max",
                title: "Максимальное число",
                ordering: 'minimize',
                view: function (val) {
                    return '[' + val + ']'
                }
            }
        ];
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
