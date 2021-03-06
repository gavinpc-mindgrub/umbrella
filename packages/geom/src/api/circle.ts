import { Attribs, IHiccupShape, Type } from "@thi.ng/geom-api";
import { set, Vec } from "@thi.ng/vectors";
import { copyAttribs } from "../internal/copy-attribs";

export class Circle implements IHiccupShape {
    pos: Vec;
    r: number;
    attribs?: Attribs;

    constructor(pos: Vec = [0, 0], r = 1, attribs?: Attribs) {
        this.pos = pos;
        this.r = r;
        this.attribs = attribs;
    }

    get type() {
        return Type.CIRCLE;
    }

    copy(): Circle {
        return new Circle(set([], this.pos), this.r, copyAttribs(this));
    }

    toHiccup() {
        return ["circle", this.attribs, this.pos, this.r];
    }
}
