class ScanPad {
    constructor(canvas, onChange = () => {}) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.onChange = onChange;
        this.strokes = [];
        this.currentStroke = null;
        this.pointers = new Map();
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.tool = 'pen';
        this.gesture = false;
        this.frame = null;
        this.ink = getComputedStyle(document.documentElement).getPropertyValue('--thelo-blue').trim() || '#2563EB';
        canvas.addEventListener('pointerdown', event => this.pointerDown(event));
        canvas.addEventListener('pointermove', event => this.pointerMove(event));
        canvas.addEventListener('pointerup', event => this.pointerEnd(event));
        canvas.addEventListener('pointercancel', event => this.pointerEnd(event));
        canvas.addEventListener('lostpointercapture', event => this.pointerEnd(event));
        canvas.addEventListener('wheel', event => this.wheel(event), { passive: false });
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(canvas);
    }

    get hasInk() {
        return this.strokes.some(stroke => !stroke.erase) || !!(this.currentStroke && !this.currentStroke.erase);
    }

    setTool(tool) {
        this.finishStroke();
        this.tool = tool;
        this.canvas.style.cursor = tool === 'hand' ? 'grab' : 'crosshair';
    }

    position(event) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    world(point) {
        return { x: (point.x - this.camera.x) / this.camera.zoom, y: (point.y - this.camera.y) / this.camera.zoom };
    }

    pointerDown(event) {
        if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) return;
        event.preventDefault();
        this.canvas.setPointerCapture(event.pointerId);
        const point = this.position(event);
        this.pointers.set(event.pointerId, point);
        if (this.pointers.size > 1) {
            if (this.currentStroke?.points.length === 1) this.currentStroke = null;
            this.finishStroke();
            this.gesture = true;
            this.scheduleRender();
            return;
        }
        this.gesture = this.tool === 'hand' || event.button === 1;
        if (this.gesture) return;
        this.currentStroke = {
            erase: this.tool === 'eraser',
            width: (this.tool === 'eraser' ? 26 : 3) / this.camera.zoom,
            points: [this.world(point)]
        };
        this.paint(this.context, this.currentStroke);
        this.onChange();
    }

    pointerMove(event) {
        if (!this.pointers.has(event.pointerId)) return;
        event.preventDefault();
        const previous = [...this.pointers.values()];
        const oldPoint = this.pointers.get(event.pointerId);
        const point = this.position(event);
        this.pointers.set(event.pointerId, point);
        const current = [...this.pointers.values()];
        if (current.length > 1) {
            const before = this.midpoint(previous[0], previous[1]);
            const after = this.midpoint(current[0], current[1]);
            const oldDistance = Math.hypot(previous[1].x - previous[0].x, previous[1].y - previous[0].y);
            const distance = Math.hypot(current[1].x - current[0].x, current[1].y - current[0].y);
            this.zoomAt(before, oldDistance > 0 ? distance / oldDistance : 1, after);
        } else if (this.gesture) {
            this.camera.x += point.x - oldPoint.x;
            this.camera.y += point.y - oldPoint.y;
            this.scheduleRender();
        } else if (this.currentStroke) {
            const samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
            for (const sample of samples.length ? samples : [event]) {
                const last = this.currentStroke.points[this.currentStroke.points.length - 1];
                const next = this.world(this.position(sample));
                this.currentStroke.points.push(next);
                this.paint(this.context, { ...this.currentStroke, points: [last, next] });
            }
        }
    }

    pointerEnd(event) {
        if (!this.pointers.has(event.pointerId)) return;
        this.finishStroke();
        this.pointers.delete(event.pointerId);
        if (!this.pointers.size) this.gesture = false;
    }

    finishStroke() {
        if (this.currentStroke) {
            this.strokes.push(this.currentStroke);
            this.currentStroke = null;
            this.onChange();
        }
    }

    midpoint(first, second) {
        return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    }

    zoomAt(point, factor, target = point) {
        const anchor = this.world(point);
        this.camera.zoom = Math.max(0.25, Math.min(4, this.camera.zoom * factor));
        this.camera.x = target.x - anchor.x * this.camera.zoom;
        this.camera.y = target.y - anchor.y * this.camera.zoom;
        this.scheduleRender();
    }

    wheel(event) {
        event.preventDefault();
        this.finishStroke();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.canvas.clientHeight : 1;
        if (event.ctrlKey || event.metaKey) this.zoomAt(this.position(event), Math.exp(-event.deltaY * unit * 0.002));
        else {
            this.camera.x -= (event.shiftKey ? event.deltaY : event.deltaX) * unit;
            this.camera.y -= (event.shiftKey ? event.deltaX : event.deltaY) * unit;
            this.scheduleRender();
        }
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        this.ratio = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(rect.width * this.ratio);
        this.canvas.height = Math.round(rect.height * this.ratio);
        this.render();
    }

    paint(context, stroke) {
        const first = stroke.points[0];
        if (!first) return;
        context.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
        context.strokeStyle = this.ink;
        context.fillStyle = this.ink;
        context.lineWidth = stroke.width;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        if (stroke.points.length === 1) {
            context.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
            context.fill();
        } else {
            context.moveTo(first.x, first.y);
            for (let index = 1; index < stroke.points.length; index++) {
                context.lineTo(stroke.points[index].x, stroke.points[index].y);
            }
            context.stroke();
        }
    }

    scheduleRender() {
        if (this.frame !== null) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = null;
            this.render();
        });
    }

    render() {
        const ratio = this.ratio || 1;
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.setTransform(ratio * this.camera.zoom, 0, 0, ratio * this.camera.zoom,
            ratio * this.camera.x, ratio * this.camera.y);
        for (const stroke of this.strokes) this.paint(this.context, stroke);
        if (this.currentStroke) this.paint(this.context, this.currentStroke);
        this.canvas.style.backgroundSize = `${25 * this.camera.zoom}px ${25 * this.camera.zoom}px`;
        this.canvas.style.backgroundPosition = `${this.camera.x}px ${this.camera.y}px`;
    }

    clear() {
        this.pointers.clear();
        this.currentStroke = null;
        this.strokes = [];
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.gesture = false;
        this.render();
        this.onChange();
    }

    undo() {
        this.finishStroke();
        this.strokes.pop();
        this.render();
        this.onChange();
    }

    home() {
        this.finishStroke();
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.render();
    }

    exportImage() {
        this.finishStroke();
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
        for (const stroke of this.strokes) {
            if (stroke.erase) continue;
            for (const point of stroke.points) {
                left = Math.min(left, point.x - stroke.width / 2);
                top = Math.min(top, point.y - stroke.width / 2);
                right = Math.max(right, point.x + stroke.width / 2);
                bottom = Math.max(bottom, point.y + stroke.width / 2);
            }
        }
        if (!Number.isFinite(left)) return null;
        const margin = 24;
        const width = right - left + margin * 2;
        const height = bottom - top + margin * 2;
        const scale = Math.min(2, 4096 / width, 4096 / height, Math.sqrt(4000000 / (width * height)));
        const ink = document.createElement('canvas');
        ink.width = Math.max(1, Math.ceil(width * scale));
        ink.height = Math.max(1, Math.ceil(height * scale));
        const context = ink.getContext('2d');
        context.setTransform(scale, 0, 0, scale, (margin - left) * scale, (margin - top) * scale);
        for (const stroke of this.strokes) this.paint(context, stroke);
        const flat = document.createElement('canvas');
        flat.width = ink.width;
        flat.height = ink.height;
        const background = flat.getContext('2d');
        background.fillStyle = '#ffffff';
        background.fillRect(0, 0, flat.width, flat.height);
        background.drawImage(ink, 0, 0);
        return flat.toDataURL('image/png');
    }
}
