import { ICopy } from "@thi.ng/api";
import { isNumber } from "@thi.ng/checks/is-number";
import { Vec } from "@thi.ng/vectors/api";
import { PI } from "@thi.ng/vectors/math";
import { Vec2 } from "@thi.ng/vectors/vec2";
import { Vec3 } from "@thi.ng/vectors/vec3";
import {
    Attribs,
    IArcLength,
    IArea,
    IClassifyPoint,
    IPointInside,
    IPointMap
} from "./api";
import { PointContainer2 } from "./container2";
import { arcLength } from "./internal/arc-length";
import { fromBarycentric, toBarycentric } from "./internal/barycentric";
import { classifyPointInTriangle2, corner, pointInTriangle2 } from "./internal/corner";

export class Triangle2 extends PointContainer2 implements
    IArea,
    IArcLength,
    IClassifyPoint<Vec2>,
    ICopy<Triangle2>,
    IPointInside<Vec2>,
    IPointMap<Vec2, Vec3> {

    static equilateral(a: Vec2, b: Vec2) {
        const dir = b.subNew(a);
        const c = dir.perpendicularLeft().normalize(dir.mag() * Math.sin(PI / 3));
        return new Triangle2([a, b, c.maddN(dir, 0.5)]);
    }

    copy() {
        return new Triangle2(this._copy(), { ...this.attribs });
    }

    classifyPoint(p: Readonly<Vec2>): number {
        const [a, b, c] = this.points;
        return classifyPointInTriangle2(p, a, b, c);
    }

    pointInside(p: Readonly<Vec2>): boolean {
        const [a, b, c] = this.points;
        return pointInTriangle2(p, a, b, c);
    }

    arcLength(): number {
        return arcLength(this.points, true);
    }

    area(signed = true) {
        const [a, b, c] = this.points;
        const area = 0.5 * corner(a, b, c);
        return signed ? area : Math.abs(area);
    }

    mapPoint(p: Readonly<Vec2>, out?: Vec3): Vec3 {
        const [a, b, c] = this.points;
        return toBarycentric(a, b, c, p, out);
    }

    unmapPoint(p: Readonly<Vec3>, out?: Vec2): Vec2 {
        const [a, b, c] = this.points;
        return fromBarycentric(a, b, c, p, out);
    }

    toHiccup() {
        return this._toHiccup("polygon");
    }

    toJSON() {
        return this._toJSON("triangle2");
    }
}

export function triangle2(points: Vec, start?: number, cstride?: number, estride?: number, attribs?: Attribs): Triangle2;
export function triangle2(a: Vec2, b: Vec2, c: Vec2, attribs?: Attribs): Triangle2;
export function triangle2(points: Vec2[], attribs?: Attribs): Triangle2;
export function triangle2(points, ...args: any[]) {
    let attribs;
    if (points instanceof Vec2) {
        points = [points, args[0], args[1]];
        attribs = args[2];
    } else if (isNumber(points[0])) {
        points = Vec2.mapBuffer(
            points,
            3,
            args[0] || 0,
            args[1] || 1,
            args[2] || 2
        );
        attribs = args[3];
    } else {
        attribs = args[0];
    }
    return new Triangle2(points, attribs);
}