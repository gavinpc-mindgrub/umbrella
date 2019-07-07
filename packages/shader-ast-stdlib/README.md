# @thi.ng/shader-ast-stdlib

[![npm (scoped)](https://img.shields.io/npm/v/@thi.ng/shader-ast-stdlib.svg)](https://www.npmjs.com/package/@thi.ng/shader-ast-stdlib)
![npm downloads](https://img.shields.io/npm/dm/@thi.ng/shader-ast-stdlib.svg)
[![Twitter Follow](https://img.shields.io/twitter/follow/thing_umbrella.svg?style=flat-square&label=twitter)](https://twitter.com/thing_umbrella)

This project is part of the
[@thi.ng/umbrella](https://github.com/thi-ng/umbrella/) monorepo.

<!-- TOC depthFrom:2 depthTo:3 -->

- [About](#about)
- [Installation](#installation)
- [Dependencies](#dependencies)
- [Usage examples](#usage-examples)
    - [Basic Lambert shader](#basic-lambert-shader)
    - [Generated vertex shader](#generated-vertex-shader)
    - [Generated fragment shader](#generated-fragment-shader)
    - [Using higher order functions](#using-higher-order-functions)
- [API](#api)
    - [Color](#color)
    - [Fog](#fog)
    - [Lighting](#lighting)
    - [Math](#math)
    - [Matrix operations](#matrix-operations)
    - [Noise / randomness](#noise--randomness)
    - [Raymarching](#raymarching)
    - [Screen coordinates](#screen-coordinates)
    - [Signed Distance Fields](#signed-distance-fields)
    - [Texture lookups](#texture-lookups)
- [Authors](#authors)
- [License](#license)

<!-- /TOC -->

## About

A growing collection (currently 110+) of useful functions & higher order
constructs for GPU / shader programming, acting as optional standard
library for
[@thi.ng/shader-ast](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast)
based workflows.

These functions can be imported like normal TS/JS functions and (in TS)
are fully type checked.

Some of the functions have been ported from GLSL:

- Signed Distance Field primitives and operations are based on work by
Inigo Quilezles (iq).
- Hash functions (PRNGs) by Dave Hoskins
- Noise functions by Ashima Arts / Stefan Gustavson
- Various functions from thi.ng/shadergraph, thi.ng/vectors,
  thi.ng/matrices, thi.ng/color

Reference:

- http://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
- http://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
- https://www.shadertoy.com/view/4djSRW
- https://github.com/ashima/webgl-noise

## Installation

```bash
yarn add @thi.ng/shader-ast-stdlib
```

## Dependencies

- [@thi.ng/shader-ast](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast)

## Usage examples

There're are several `shader-ast` & `webgl` examples in the
[/examples](https://github.com/thi-ng/umbrella/tree/master/examples)
folder of this repo, for example...

(Possibly non-exhaustive list, live demo links in readme's)

- [Canvas2D shader](https://github.com/thi-ng/umbrella/tree/master/examples/shader-ast-canvas2d)
- [2D SDF](https://github.com/thi-ng/umbrella/tree/master/examples/shader-ast-sdf2d)
- [Raymarching](https://github.com/thi-ng/umbrella/tree/master/examples/shader-ast-raymarch)
- [Simplex noise](https://github.com/thi-ng/umbrella/tree/master/examples/shader-ast-noise)
- [Textured tunnel](https://github.com/thi-ng/umbrella/tree/master/examples/shader-ast-tunnel)
- [Cubemap](https://github.com/thi-ng/umbrella/tree/master/examples/webgl-cubemap)
- [Grid instancing](https://github.com/thi-ng/umbrella/tree/master/examples/webgl-grid)
- [GPGPU basics](https://github.com/thi-ng/umbrella/tree/master/examples/webgl-gpgpu-basics)
- [MSDF font rendering](https://github.com/thi-ng/umbrella/tree/master/examples/webgl-msdf)
- [SSAO deferred rendering](https://github.com/thi-ng/umbrella/tree/master/examples/webgl-ssao)

### Basic Lambert shader

Below is a brief demonstration of a fully defined shader pair,
implementing basic diffuse lighting:

```ts
import { assign, defMain, vec4 } from "@thi.ng/shader-ast";
import { diffuseLighting, halfLambert, transformMVP } from "@thi.ng/shader-ast-stdlib";
import { shader } from "@thi.ng/webgl";

// obtain WebGL/WebGL2 context
// the generated shader code will automatically target the right GLSL version
const gl = ...

// transpile & instantiate fully working shader
const myShader = shader(gl, {
    // vertex shader fn
    // given args are symbolic uniforms, attribs, varyings & GL builtin vars
    vs: (gl, unis, ins, outs) => [
        defMain(() => [
            assign(outs.vnormal, ins.normal),
            assign(gl.gl_Position, transformMVP(ins.position, unis.model, unis.view, unis.proj)),
        ])
    ],
    // fragment shader fn
    // here `ins` are "varying" & `outs` are output variables
    fs: (gl, unis, ins, outs) => [
        defMain(() => [
            assign(
                outs.fragCol,
                vec4(
                    diffuseLighting(
                        halfLambert(normalize(ins.vnormal), unis.lightDir),
                        unis.diffuseCol,
                        unis.lightCol,
                        unis.ambientCol
                    ),
                    1
                )
            )
        ])
    ],
    // attribs w/ optional location info
    attribs: {
        position: ["vec3", 0],
        normal: ["vec3", 1]
    },
    varying: {
        vnormal: "vec3"
    },
    // uniforms with optional default values / functions
    uniforms: {
        model: "mat4",
        view: "mat4",
        proj: "mat4",
        lightDir: ["vec3", [0, 1, 0]],
        lightCol: ["vec3", [1, 1, 1]],
        diffuseCol: ["vec3", [0.8, 0, 0]],
        ambientCol: ["vec3", [0.1, 0.1, 0.1]]
    }
});
```

### Generated vertex shader

The `#define`s are auto-injected by default, but can be disabled /
customized / replaced...

```glsl
#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp int;
precision highp float;
#else
precision mediump int;
precision mediump float;
#endif
#ifndef PI
#define PI 3.141592653589793
#endif
#ifndef TAU
#define TAU 6.283185307179586
#endif
#ifndef HALF_PI
#define HALF_PI 1.570796326794896
#endif

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;
uniform vec3 lightDir;
uniform vec3 lightCol;
uniform vec3 diffuseCol;
uniform vec3 ambientCol;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
out vec3 vnormal;
void main() {
vnormal = normal;
gl_Position = ((proj * (view * model)) * vec4(position, 1.0));
}
```

### Generated fragment shader

The `fragColor` output variable is auto-created by
[@thi.ng/webgl](https://github.com/thi-ng/umbrella/tree/master/packages/webgl)
if no other output vars are defined. For WebGL v1 this is defined as an
alias for `gl_FragColor`...

```glsl
#version 300 es

/* (omitting #define's for bevity, same as in VS) */

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;
uniform vec3 lightDir;
uniform vec3 lightCol;
uniform vec3 diffuseCol;
uniform vec3 ambientCol;
in vec3 vnormal;
layout(location=0) out vec4 fragColor;
void main() {
fragColor = vec4((((lightCol * ((dot(normalize(vnormal), lightDir) * 0.5) + 0.5)) * diffuseCol) + ambientCol), 1.0);
}
```

### Using higher order functions

Several of the functions included here are defined as higher-order
functions, providing powerful compositional features not usually seen in
shader code. For example, the [`additive()`](https://github.com/thi-ng/umbrella/blob/master/packages/shader-ast-stdlib/src/math/additive.ts#L21) HOF takes a single-arg scalar
function and a number of octaves. It returns a new function which
computes the summed value of `fn` over the given number octaves, with a
user defined decay factor (per octave). This can be used for additive
wave synthesis, multi-octave noise or any other similar use cases...

Below is the main shader code of the [Simplex noise
example](https://github.com/thi-ng/umbrella/tree/master/examples/shader-ast-noise).

```ts
import { add, defn, float, ret, sym, vec2, vec3, vec4 } from "@thi.ng/shader-ast";
import { additive, aspectCorrectedUV, fit1101, snoise2 } from "@thi.ng/shader-ast-stdlib";

const mainImage = defn(
    "vec4",
    "mainImage",
    [["vec2"], ["vec2"], ["float"]],
    (frag, res, time) => {
        let uv;
        let noise;
        return [
            // compute UV coords and assign to `uv`
            uv = sym(aspectCorrectedUV(frag, res)),
            // dynamically create a multi-octave version of `snoise2`
            // computed over 4 octaves
            noise = sym(
                additive("vec2", snoise2, 4)(add(uv, time), vec2(2), float(0.5))
            ),
            // `noise` is in [-1..1] interval, use fit1101 to fit to [0..1]
            ret(vec4(vec3(fit1101(noise)), 1))
        ];
    }
);
```

Run the above-linked example and view the console to see the full
generated shader code. Also check out the raymarching demo which uses
several other HOFs from this library to drastically simplify user code.

## API

TODO. For now, please see doc strings in source for details...

### Color

[/src/color](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/color/)

- `toLinear`
- `toSRGB`
- `luminanceRGB`

### Fog

[/src/fog](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/fog/)

- `fogLinear`
- `fogExp`
- `fogExp2`

### Lighting

[/src/light](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/light/)

- `lambert`
- `halfLambert`
- `diffuseLighting`
- `trilight`

### Math

[/src/math](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/math/)

- `additive`
- `cartesian2` / `cartesian3`
- `clamp01` / `clamp11`
- `cross2` / `crossC2`
- `distChebyshev2` / `distChebyshev3` / `distChebyshev4`
- `distManhattan2` / `distManhattan3` / `distManhattan4`
- `fit01` / `fit11` / `fit1101` / `fit0111`
- `magSq2` / `magSq3` / `magSq4`
- `maxComp2` / `maxComp3` / `maxComp4`
- `minComp2` / `minComp3` / `minComp4`
- `perpendicularCCW` / `perpendicularCW`
- `orthogonal3`
- `polar2` / `polar3`
- `sincos` / `cossin`

### Matrix operations

[/src/matrix](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/matrix/)

- `lookat`
- `transformMVP`
- `surfaceNormal`
- `rotation2`
- `rotationX3` / `rotationY3` / `rotationZ3`
- `rotationX4` / `rotationY4` / `rotationZ4`

### Noise / randomness

[/src/noise](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/noise/)

- `hash2` / `hash3`
- `hash11` / `hash12` / `hash13`
- `hash21` / `hash22` / `hash23`
- `hash31` / `hash32` / `hash33`
- `hash41` / `hash42` / `hash43` / `hash44`
- `permute` / `permute3` / `permute4`
- `snoise2`
- `voronoise2`
- `worley2` / `worleyDist` / `worleyDistManhattan`

### Raymarching

[/src/raymarch](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/raymarch/)

- `raymarchAO`
- `raymarchDir`
- `raymarchNormal`
- `raymarchScene`
- `rayPointAt`

### Screen coordinates

[/src/screen](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/screen/)

- `aspectCorrectedUV`

### Signed Distance Fields

[/src/sdf](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/sdf/)

- `sdfAnnular`
- `sdfBox2`
- `sdfBox3`
- `sdfCircle`
- `sdfCylinder`
- `sdfIntersect`
- `sdfLine2`
- `sdfLine3`
- `sdfPlane2`
- `sdfPlane3`
- `sdfRepeat2`
- `sdfRepeat3`
- `sdfRound`
- `sdfSmoothIntersect`
- `sdfSmoothSubtract`
- `sdfSmoothUnion`
- `sdfSphere`
- `sdfTorus`
- `sdfTriangle2`
- `sdfUnion`

### Texture lookups

[/src/tex](https://github.com/thi-ng/umbrella/tree/master/packages/shader-ast-stdlib/src/tex/)

- `indexToCoord` / `coordToIndex`
- `indexToUV` / `uvToIndex`
- `readIndex1` / `readIndex2` / `readIndex3` / `readIndex4`

## Authors

- Karsten Schmidt

## License

&copy; 2019 Karsten Schmidt // Apache Software License 2.0