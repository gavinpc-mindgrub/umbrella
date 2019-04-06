import { DGraph } from "@thi.ng/dgraph";
import { ShaderSnippet } from "../api";

/**
 * Build shader snippet dependency graph.
 *
 * @param spec
 * @param graph
 */
const buildGraph = (spec: ShaderSnippet, graph?: DGraph<ShaderSnippet>) =>
    spec.deps
        ? spec.deps.reduce(
              (graph, d) => buildGraph(d, graph.addDependency(spec, d)),
              graph || new DGraph<ShaderSnippet>()
          )
        : graph;

/**
 * Takes given shader snippet, resolves all transitive dependencies and
 * assembles source code in dependency order.
 *
 * @param spec
 */
export const assemble = (spec: ShaderSnippet) =>
    spec.deps
        ? buildGraph(spec)
              .sort()
              .map((s) => s.src)
              .join("\n")
        : spec.src;

/**
 * Combines given GLSL `src` and optional `ShaderSnippet` `deps` into a
 * new snippet.
 *
 * @param src
 * @param deps
 */
export const defglsl = (src: string, deps?: ShaderSnippet[]) =>
    <ShaderSnippet>{ src, deps };

/**
 * Like `defglsl`, but then immediately assembles the full source code,
 * incl. all transitive dependency snippets (in correct order).
 *
 * @see assemble
 *
 * @param src
 * @param deps
 */
export const defglslA = (src: string, deps?: ShaderSnippet[]) =>
    assemble(defglsl(src, deps));