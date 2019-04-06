import { isString } from "@thi.ng/checks";
import { WeblGLCanvasOpts } from "./api";
import { error } from "./error";

const defaultOpts: WebGLContextAttributes = {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false
};

export const glCanvas = (opts: Partial<WeblGLCanvasOpts> = {}) => {
    const canvas = opts.canvas
        ? isString(opts.canvas)
            ? <HTMLCanvasElement>document.getElementById(opts.canvas)
            : opts.canvas
        : document.createElement("canvas");
    opts.width && (canvas.width = opts.width);
    opts.height && (canvas.height = opts.height);
    opts.autoScale !== false && adaptDPI(canvas, canvas.width, canvas.height);
    opts.parent && opts.parent.appendChild(canvas);
    const gl = <WebGLRenderingContext>canvas.getContext(
        opts.version === 2 ? "webgl2" : "webgl",
        {
            ...defaultOpts,
            ...opts.opts
        }
    );
    if (!gl) {
        error("WebGL unavailable");
    }
    opts.onContextLost &&
        canvas.addEventListener("webglcontextlost", opts.onContextLost);
    return {
        canvas,
        gl
    };
};

/**
 * Sets the canvas size to given `width` & `height` and adjusts style to
 * compensate for HDPI devices. Note: For 2D canvases, this will
 * automatically clear any prior canvas content.
 *
 * @param canvas
 * @param width uncompensated pixel width
 * @param height uncompensated pixel height
 */
export const adaptDPI = (
    canvas: HTMLCanvasElement,
    width: number,
    height: number
) => {
    const dpr = window.devicePixelRatio || 1;
    if (dpr != 1) {
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    }
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    return dpr;
};