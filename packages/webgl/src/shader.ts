import { Fn3, IObjectOf, Tuple } from "@thi.ng/api";
import { existsAndNotNull, isArray, isFunction } from "@thi.ng/checks";
import {
    GLSL,
    GLSLDeclPrefixes,
    GLSLVersion,
    IShader,
    ModelAttributeSpecs,
    ModelSpec,
    ShaderAttrib,
    ShaderAttribSpecs,
    ShaderSpec,
    ShaderState,
    ShaderType,
    ShaderUniform,
    ShaderUniforms,
    ShaderUniformSpecs,
    UniformValues
} from "./api";
import { error } from "./error";
import { GLSL_HEADER, PREFIXES, SYNTAX } from "./glsl/syntax";
import { UNIFORM_SETTERS } from "./uniforms";

// [SRC_ALPHA, ONE_MINUS_SRC_ALPHA];
export const DEFAULT_BLEND: Tuple<GLenum, 2> = [0x302, 0x303];

const ERROR_REGEXP = /ERROR: \d+:(\d+): (.*)/;

export class Shader implements IShader {
    static fromSpec(gl: WebGLRenderingContext, spec: ShaderSpec) {
        const srcVS = prepareShaderSource(spec, "vs");
        const srcFS = prepareShaderSource(spec, "fs");
        console.log(srcVS);
        console.log(srcFS);
        const vs = compileShader(gl, gl.VERTEX_SHADER, srcVS);
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, srcFS);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const attribs = initAttributes(
                gl,
                program,
                spec.attribs,
                spec.version
            );
            const uniforms = initUniforms(gl, program, spec.uniforms);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            return new Shader(gl, program, attribs, uniforms, spec.state);
        }
        throw new Error(
            `Error linking shader: ${gl.getProgramInfoLog(program)}`
        );
    }

    gl: WebGLRenderingContext;
    program: WebGLProgram;
    attribs: IObjectOf<ShaderAttrib>;
    uniforms: ShaderUniforms;
    state: Partial<ShaderState>;

    constructor(
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        attribs: IObjectOf<ShaderAttrib>,
        uniforms: ShaderUniforms,
        state: Partial<ShaderState>
    ) {
        this.gl = gl;
        this.program = program;
        this.attribs = attribs;
        this.uniforms = uniforms;
        this.state = state || {};
    }

    bind(spec: ModelSpec) {
        if (this.program) {
            this.prepareShaderState();
            this.gl.useProgram(this.program);
            this.bindAttribs(spec.attribs);
            this.bindUniforms(spec.uniforms);
            return true;
        }
        return false;
    }

    unbind() {
        this.gl.useProgram(null);
        return true;
    }

    release() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
            delete this.program;
            return true;
        }
        return false;
    }

    bindAttribs(specAttribs: ModelAttributeSpecs) {
        const gl = this.gl;
        let shaderAttrib;
        for (let id in specAttribs) {
            if (specAttribs.hasOwnProperty(id)) {
                if ((shaderAttrib = this.attribs[id])) {
                    const attr = specAttribs[id];
                    attr.buffer.bind();
                    gl.enableVertexAttribArray(shaderAttrib.loc);
                    gl.vertexAttribPointer(
                        shaderAttrib.loc,
                        attr.size || 3,
                        attr.type || gl.FLOAT,
                        attr.normalized,
                        attr.stride || 0,
                        attr.offset || 0
                    );
                } else {
                    console.warn(`unknown attrib: ${id}`);
                }
            }
        }
    }

    bindUniforms(specUnis: UniformValues) {
        const shaderUnis = this.uniforms;
        for (let id in specUnis) {
            if (specUnis.hasOwnProperty(id)) {
                const u = shaderUnis[id];
                if (u) {
                    const val = specUnis[id];
                    u.setter(isFunction(val) ? val(shaderUnis, specUnis) : val);
                } else {
                    console.warn(`unknown uniform: ${id}`);
                }
            }
        }
        // apply defaults for non-specified uniforms in user spec
        for (let id in shaderUnis) {
            if (
                shaderUnis.hasOwnProperty(id) &&
                (!specUnis || !existsAndNotNull(specUnis[id]))
            ) {
                const u = shaderUnis[id];
                u.setter(
                    u.defaultFn ? u.defaultFn(shaderUnis, specUnis) : undefined
                );
            }
        }
    }

    prepareShaderState(state = this.state) {
        const gl = this.gl;
        state.depth !== undefined && this.setState(gl.DEPTH_TEST, state.depth);
        if (state.cull !== undefined) {
            this.setState(gl.CULL_FACE, state.cull);
            state.cullMode && gl.cullFace(state.cullMode);
        }
        if (state.blend !== undefined) {
            this.setState(gl.BLEND, state.blend);
            state.blendFn && gl.blendFunc(state.blendFn[0], state.blendFn[1]);
            state.blendEq !== undefined && gl.blendEquation(state.blendEq);
        }
        if (state.stencil !== undefined) {
            this.setState(gl.STENCIL_TEST, state.stencil);
            state.stencilFn &&
                gl.stencilFunc(
                    state.stencilFn[0],
                    state.stencilFn[1],
                    state.stencilFn[2]
                );
            state.stencilOp &&
                gl.stencilOp(
                    state.stencilOp[0],
                    state.stencilOp[1],
                    state.stencilOp[2]
                );
            state.stencilMask !== undefined &&
                gl.stencilMask(state.stencilMask);
        }
    }

    protected setState(id: number, val: GLenum | boolean) {
        if (val) {
            this.gl.enable(id);
        } else {
            this.gl.disable(id);
        }
    }
}

export const shader = (gl: WebGLRenderingContext, spec: ShaderSpec) =>
    Shader.fromSpec(gl, spec);

const compileVars = (
    attribs: any,
    syntax: Fn3<string, any, GLSLDeclPrefixes, string>,
    prefixes: GLSLDeclPrefixes
) => {
    let decls: string[] = [];
    for (let id in attribs) {
        if (attribs.hasOwnProperty(id)) {
            decls.push(syntax(id, attribs[id], prefixes));
        }
    }
    decls.push("");
    return decls.join("\n");
};

export const prepareShaderSource = (spec: ShaderSpec, type: ShaderType) => {
    const syntax = SYNTAX[spec.version || GLSLVersion.GLES_100];
    const prefixes = { ...PREFIXES, ...spec.declPrefixes };
    const isVS = type === "vs";
    let src = "";
    spec.version && (src += `#version ${spec.version}\n`);
    src += spec.pre
        ? spec.replacePrelude
            ? spec.pre
            : spec.pre + "\n" + GLSL_HEADER
        : GLSL_HEADER;
    if (spec.generateDecls !== false) {
        src += isVS
            ? compileVars(spec.attribs, syntax.attrib, prefixes)
            : compileVars(
                  spec.outputs || { fragColor: GLSL.vec4 },
                  syntax.output,
                  prefixes
              );
        src += compileVars(spec.varying, syntax.varying[type], prefixes);
        src += compileVars(spec.uniforms, syntax.uniform, prefixes);
    }
    src += spec[type];
    spec.post && (src += "\n" + spec.post);
    return src;
};

export const compileShader = (
    gl: WebGLRenderingContext,
    type: GLenum,
    src: string
) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    }
    parseAndThrowShaderError(gl, shader, src);
};

const parseAndThrowShaderError = (
    gl: WebGLRenderingContext,
    shader: WebGLShader,
    src: string
) => {
    const lines = src.split("\n");
    const log = gl.getShaderInfoLog(shader).split("\n");
    const errors = log
        .map((line) => {
            const matches = ERROR_REGEXP.exec(line);
            const ln = matches ? matches[1] : null;
            if (ln) {
                return `line ${ln}: ${matches[2]}\n${lines[parseInt(ln) - 1]}`;
            }
        })
        .filter(existsAndNotNull)
        .join("\n");
    error(`Error compiling shader:\n${errors}`);
};

const initAttributes = (
    gl: WebGLRenderingContext,
    prog: WebGLProgram,
    attribs: ShaderAttribSpecs,
    version: GLSLVersion
) => {
    const res = <IObjectOf<ShaderAttrib>>{};
    for (let id in attribs) {
        if (attribs.hasOwnProperty(id)) {
            const val = attribs[id];
            const [type, loc] = isArray(val) ? val : [val, null];
            const aid = `a_${id}`;
            if (loc != null && version && version >= "300") {
                gl.bindAttribLocation(prog, loc, aid);
                res[id] = { type, loc };
            } else {
                res[id] = {
                    type,
                    loc: gl.getAttribLocation(prog, aid)
                };
            }
        }
    }
    return res;
};

const initUniforms = (
    gl: WebGLRenderingContext,
    prog: WebGLProgram,
    uniforms: ShaderUniformSpecs
) => {
    const res = <IObjectOf<ShaderUniform>>{};
    for (let id in uniforms) {
        if (uniforms.hasOwnProperty(id)) {
            const val = uniforms[id];
            let type: GLSL;
            let t1, t2, defaultVal, defaultFn;
            if (isArray(val)) {
                [type, t1, t2] = val;
                defaultVal = type < GLSL.bool_array ? t1 : t2;
                if (isFunction(defaultVal)) {
                    defaultFn = defaultVal;
                    defaultVal = undefined;
                }
            } else {
                type = val;
            }
            const loc = gl.getUniformLocation(prog, `u_${id}`);
            const setter = UNIFORM_SETTERS[type];
            if (setter) {
                res[id] = {
                    loc,
                    setter: setter(gl, loc, defaultVal),
                    defaultFn,
                    defaultVal,
                    type
                };
            } else {
                error(`invalid uniform type: ${GLSL[type]}`);
            }
        }
    }
    return res;
};