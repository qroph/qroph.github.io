(function() {
    class Point {
        constructor(x, y, update) {
            this._onUpdate = update;
            this._graphics = new PIXI.Graphics();
            this._graphics.interactive = true;
            this._graphics.beginFill(brandColor);
            this._graphics.drawCircle(0, 0, 10);
            this._graphics.endFill();
            this._graphics.x = x;
            this._graphics.y = y;
            this._graphics
                .on('pointerdown', this._onDragStart.bind(this))
                .on('pointerup', this._onDragEnd.bind(this))
                .on('pointermove', this._onDragMove.bind(this));
            catmullrom_app.stage.addChildAt(this._graphics, 0);
        }

        destroyGraphics() {
            this._graphics.destroy();
            this._graphics = null;
        }

        _onDragStart(event) {
            this._eventData = event.data;
            this._dragging = true;
        }

        _onDragEnd() {
            this._eventData = null;
            this._dragging = false;
        }

        _onDragMove() {
            if (this._dragging) {
                this._graphics.position = this._eventData.getLocalPosition(this._graphics.parent);
                this._onUpdate();
            }
        }

        get x() { return this._graphics.x; }
        get y() { return this._graphics.y; }
    };

    class Curve {
        constructor() {
            this._graphics = new PIXI.Graphics();
            catmullrom_app.stage.addChild(this._graphics);

            this._tension = 0;
            this._alpha = 0.5;
            this._drawLines = false;
            this._closed = false;
            this._points = [];

            this.update();
        }

        get tension() { return this._tension; }
        set tension(value) {
            this._tension = value;
            this.update();
        }

        get alpha() { return this._alpha; }
        set alpha(value) {
            this._alpha = value;
            this.update();
        }

        get drawLines() { return this._drawLines; }
        set drawLines(value) {
            this._drawLines = value;
            this.update();
        }

        get closed() { return this._closed; }
        set closed(value) {
            this._closed = value;
            this.update();
        }

        update(export_svg = false) {
            this._graphics.clear();

            const dist = (p0, p1) => {
                return Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
            };

            const ps = this._points.slice();

            for (let i = ps.length - 1; i > 0; i--) {
                if (dist(ps[i], ps[i - 1]) < 1) {
                    ps.splice(i, 1);
                }
            }

            if (this._closed && dist(ps[0], ps[ps.length - 1]) < 1) {
                ps.splice(ps.length - 1, 1);
            }

            const numPoints = ps.length;
            if (numPoints < 2) {
                return;
            }

            let svg = '';
            let svg_offset_x = 0;
            let svg_offset_y = 0;
            if (export_svg) {
                let min_x = 10000;
                let min_y = 10000;
                let max_x = -10000;
                let max_y = -10000;
                for (let i = 0; i < this._points.length; i++) {
                    if (this._points[i].x < min_x) min_x = this._points[i].x;
                    if (this._points[i].y < min_y) min_y = this._points[i].y;
                    if (this._points[i].x > max_x) max_x = this._points[i].x;
                    if (this._points[i].y > max_y) max_y = this._points[i].y;
                }

                const margin = 10;
                svg_offset_x = -min_x + margin;
                svg_offset_y = -min_y + margin;
                const svg_width = max_x - min_x + 2 * margin;
                const svg_height = max_y - min_y + 2 * margin;

                svg += '<svg height="' + svg_height + '" width="' + svg_width + '">';
            }

            if (this._drawLines) {
                this._graphics.lineStyle(2, greyColorLight);
                this._graphics.moveTo(this._points[0].x, this._points[0].y);

                for (let i = 1; i < numPoints; i++) {
                    this._graphics.lineTo(this._points[i].x, this._points[i].y);
                }

                if (numPoints > 2 && this._closed) {
                    this._graphics.lineTo(this._points[0].x, this._points[0].y);
                }
            }

            if (this._closed) {
                ps.push(ps[0]);
                ps.push(ps[1]);
                ps.splice(0, 0, ps[numPoints - 1]);
            } else {
                const first = {
                    x: 2 * ps[0].x - ps[1].x,
                    y: 2 * ps[0].y - ps[1].y
                };
                const last = {
                    x: 2 * ps[numPoints - 1].x - ps[numPoints - 2].x,
                    y: 2 * ps[numPoints - 1].y - ps[numPoints - 2].y
                };
                ps.splice(0, 0, first);
                ps.push(last);
            }

            this._graphics.lineStyle(3, greyColorDark);
            this._graphics.moveTo(ps[1].x, ps[1].y);

            for (let i = 1; i < ps.length - 2; i++) {
                const p0 = ps[i - 1];
                const p1 = ps[i];
                const p2 = ps[i + 1];
                const p3 = ps[i + 2];

                const t0 = 0;
                const t1 = t0 + Math.pow(dist(p0, p1), this._alpha);
                const t2 = t1 + Math.pow(dist(p1, p2), this._alpha);
                const t3 = t2 + Math.pow(dist(p2, p3), this._alpha);

                const m1x = (1 - this._tension) * (t2 - t1) * ((p0.x - p1.x) / (t0 - t1) - (p0.x - p2.x) / (t0 - t2) + (p1.x - p2.x) / (t1 - t2));
                const m1y = (1 - this._tension) * (t2 - t1) * ((p0.y - p1.y) / (t0 - t1) - (p0.y - p2.y) / (t0 - t2) + (p1.y - p2.y) / (t1 - t2));
                const m2x = (1 - this._tension) * (t2 - t1) * ((p1.x - p2.x) / (t1 - t2) - (p1.x - p3.x) / (t1 - t3) + (p2.x - p3.x) / (t2 - t3));
                const m2y = (1 - this._tension) * (t2 - t1) * ((p1.y - p2.y) / (t1 - t2) - (p1.y - p3.y) / (t1 - t3) + (p2.y - p3.y) / (t2 - t3));

                const ax = 2 * p1.x - 2 * p2.x + m1x + m2x;
                const ay = 2 * p1.y - 2 * p2.y + m1y + m2y;
                const bx = -3 * p1.x + 3 * p2.x - 2 * m1x - m2x;
                const by = -3 * p1.y + 3 * p2.y - 2 * m1y - m2y;
                const cx = m1x;
                const cy = m1y;
                const dx = p1.x;
                const dy = p1.y;

                if (export_svg) {
                    svg += '<polyline points="' +
                        (svg_offset_x + p1.x).toFixed(1) + ',' +
                        (svg_offset_y + p1.y).toFixed(1);
                }

                const amount = Math.max(10, Math.ceil(dist(p0, p1) / 10));
                for (let j = 1; j <= amount; j++) {
                    const t = j / amount;
                    const px = ax * t * t * t + bx * t * t + cx * t + dx;
                    const py = ay * t * t * t + by * t * t + cy * t + dy;
                    this._graphics.lineTo(px, py);

                    if (export_svg) {
                        svg += ' ' +
                            (svg_offset_x + px).toFixed(1) + ',' +
                            (svg_offset_y + py).toFixed(1);
                    }
                }

                if (export_svg) {
                    svg += '" class="svg-text" style="fill:none;stroke-width:2" />';
                }
            }

            if (export_svg) {
                for (let i = 0; i < this._points.length; i++) {
                    svg += '<circle class="svg-brand" style="stroke:none" cx="' +
                        (svg_offset_x + this._points[i].x).toFixed(1) + '" cy="' +
                        (svg_offset_y + this._points[i].y).toFixed(1) + '" r="5" />';
                }

                svg += '</svg>';
                console.log(svg);
            }
        }

        clear() {
            const numPoints = this._points.length;
            for (let i = 0; i < numPoints; i++) {
                this._points[i].destroyGraphics();
            }
            this._points = [];
            this.update();
        }

        export() {
            this.update(true);
        }

        addPoint(x, y) {
            if (this._points.length < 100) {
                const point = new Point(x, y, this.update.bind(this));
                this._points.push(point);
                this.update();
            }
        }
    };

    window.addEventListener("load", () => {
        catmullrom_initialize();

        const curve = new Curve();

        catmullrom_gui.add(curve, 'alpha', { 'Uniform' : 0, 'Centripetal' : 0.5, 'Chordal' : 1 }).name("Type");
        catmullrom_gui.add(curve, 'tension').min(0).max(1).step(0.01).name("Tension");
        catmullrom_gui.add(curve, 'drawLines').name("Draw lines");
        catmullrom_gui.add(curve, 'closed').name("Closed loop");
        catmullrom_gui.add(curve, 'clear').name("Clear");
        //catmullrom_gui.add(curve, 'export').name("Export SVG");

        catmullrom_app.renderer.plugins.interaction.on('pointerdown', (event) => {
            const pos = event.data.global;
            const obj = catmullrom_app.renderer.plugins.interaction.hitTest(pos);
            if (obj === null) {
                curve.addPoint(pos.x, pos.y);
            }
        });
    });
})();
