export class Slider {
    constructor(min_value, max_value, height, img, hover_img, line_img, step) {

        let canvas = document.createElement('canvas');
        this.canvas = canvas;
        this.domNode = canvas;
        this.img = img;
        this.hover_img = hover_img;
        this.line_img = line_img;
        this.step = step;

        this.ticks = [];

        this.canvas.height = height;

        this.redraw();

        canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.addEventListener('mouseleave', e => {
            this.is_over = false;
            this.redraw();
        });

        this.window_move = e => {
            // tell the browser we're handling this event
            e.preventDefault();
            e.stopPropagation();
            // get mouse position
            let {x, y} = this.event2point(e);
            // set new thumb & redraw

            this.value = this.position_2_value(x - this.dx);
            this.redraw();
        };

        this.window_up = e => {
            if (e.button === 0)
                this.setup_waiting_mouse_up(false);
        };

        this.value = min_value;

        this._onvaluechange = null;
        this._min_value = min_value;
        this._max_value = max_value;
    }

    update_max_value(value) {
        this._max_value = value;
        if (this.value > this._max_value) {
            this.value = this._max_value;
            if (this._onvaluechange)
                this._onvaluechange(this.value);
        }
        this.redraw();
    }

    get value() {
        return this._value;
    }

    set_value(value, need_fire = true) {
        if (value < this._min_value)
            value = this._min_value;
        if (value > this._max_value)
            value = this._max_value;
        if (this.step)
            value = Math.round(value / this.step) * this.step;
        if (this._value === value)
            return;
        this._value = value;
        this.redraw();
        if (this._onvaluechange && need_fire)
            this._onvaluechange(this.value);
    }

    set value(value) {
        this.set_value(value);
    }

    set value_no_fire(value) {
        this.set_value(value, false);
    }

    set_visible_range(min, max) {
        this._has_visible_range = true;
        this._min_visible_value = min;
        this._max_visible_value = max;
        this.redraw();
    }

    get min_visible_value() {
        if (this._has_visible_range)
            return this._min_visible_value;
        else
            return this._min_value;
    }

    get max_visible_value() {
        if (this._has_visible_range)
            return this._max_visible_value;
        else
            return this._max_value;
    }

    resize(preferred_width) {
        this.canvas.width = preferred_width;
        this.redraw();
    }

    event2point(e) {
        let rect = this.domNode.getBoundingClientRect();
        return {x: e.clientX - rect.left, y: e.clientY - rect.top};
    }

    redraw() {
        // clear the range control area
        let ctx = this.canvas.getContext('2d');

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // bar

        let line_y = this.img.height / 2; // used to be canvas.height
        ctx.fillStyle = ctx.createPattern(this.line_img, 'repeat-x');
        ctx.save();
        ctx.translate(0, Math.round(line_y) - 3);
        ctx.fillRect(0, 0, this.canvas.width, this.line_img.height);
        ctx.restore();

        /*let xx = this.value_2_pos(this._visible_max_value) + this.img.width / 2;
        if (xx >= 0 && xx <= this.canvas.width) {
            ctx.strokeStyle = '#8f8f8f';
            ctx.beginPath();
            ctx.moveTo(xx, line_y);
            ctx.lineTo(this.canvas.width, line_y);
            ctx.stroke();
        }*/

        //thumb

        let tr = this.thumb_rect;

        ctx.drawImage(this.is_over ? this.hover_img : this.img, tr.x, tr.y);

        if (this.ticks) {
            function integerize(x) {
                let round = Math.round(x);
                if (Math.abs(x - round) < 1e-6)
                    x = round;
                return x;
            }

            ctx.font = '1em sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            for (let {multiple, length, color, draw} of this.ticks) {
                let a = Math.ceil(integerize(this._min_value / multiple));
                let b = Math.floor(integerize(this._max_value / multiple));

                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.fillStyle = color;
                for (let i = a; i <= b; i++) {
                    let val = i * multiple;
                    let pos_x = this.value_2_pos(val) + this.img.width / 2;
                    let pos_y = this.img.height + 2;

                    ctx.beginPath();
                    ctx.moveTo(pos_x, pos_y);
                    ctx.lineTo(pos_x, pos_y + length);
                    ctx.stroke();

                    //TODO don't consider '-' length while centering negative numbers
                    if (draw > 0) {
                        let hint = '' + Math.round(val); //TODO determine a number of decimal places
                        ctx.fillText(hint, pos_x, pos_y + draw);
                    }
                }
            }
        }
    }

    value_2_pos(value) {
        let w = this.canvas.width - this.img.width;
        return w * (value - this.min_visible_value) / (this.max_visible_value - this.min_visible_value);
    }

    get thumb_rect() {
        let xx = this.value_2_pos(this.value);
        return {
            x: xx,
            y: 0, // this.canvas.height / 2 - this.img.height / 2,
            w: this.img.width,
            h: this.img.height
        };
    }

    static point_in_thumb({x, y}, thumb_rect) {
        return x >= thumb_rect.x && x <= thumb_rect.x + thumb_rect.w && y >= thumb_rect.y && y <= thumb_rect.y + thumb_rect.h;
    }

    position_2_value(x) {
        x -= this.img.width / 2;
        let w = this.canvas.width - this.img.width;
        return x * (this.max_visible_value - this.min_visible_value) / w + this.min_visible_value;
        //x = w * (this.value - this.min_value) / (this.max_value - this.min_value);
    }

    setup_waiting_mouse_up(on) {
        if (on) {
            window.addEventListener('mousemove', this.window_move);
            window.addEventListener('mouseup', this.window_up);
        } else {
            window.removeEventListener('mousemove', this.window_move);
            window.removeEventListener('mouseup', this.window_up);
        }
    }

    handleMouseDown(e) {
        if (e.button !== 0)
            return;

        // tell the browser we're handling this event
        e.preventDefault();
        e.stopPropagation();
        // get mouse position
        let {x, y} = this.event2point(e);
        // test for possible start of dragging
        let tr = this.thumb_rect;

        if (Slider.point_in_thumb({x, y}, tr)) {
            this.dx = x - tr.x - this.img.width / 2;
        } else {
            this.value = this.position_2_value(x);
            this.dx = 0;
        }

        this.setup_waiting_mouse_up(true);
    }

    handleMouseMove(e) {
        this.is_over = Slider.point_in_thumb(this.event2point(e), this.thumb_rect);
        this.redraw();
    }


    get onvaluechange() {
        return this._onvaluechange;
    }

    set onvaluechange(value) {
        this._onvaluechange = value;
    }

    add_ticks(multiple, length, color, draw) {
        this.ticks.push(new Ticks(multiple, length, color, draw));
        this.redraw();
    }

    get min_value() {
        return this._min_value;
    }

    set min_value(value) {
        this._min_value = value;
        this.redraw();
    }

    get max_value() {
        return this._max_value;
    }

    set max_value(value) {
        this._max_value = value;
        this.redraw();
    }
}

class Ticks {
    constructor(multiple, length, color, draw) {
        this.multiple = multiple;
        this.length = length;
        this.color = color;
        this.draw = draw;
    }
}
