import { ISubscribable } from "@thi.ng/rstream";

export interface IToDot {
    toDot(opts?: Partial<DotOpts>): string;
}

export type NodeType =
    "default" |
    "noid" |
    "stream" |
    "streammerge" |
    "streamsync";

export interface Node {
    id: number;
    label: string;
    type: string;
    xform: boolean;
    body: string;
}

export interface WalkState {
    subs: Map<ISubscribable<any>, Node>;
    rels: Node[][];
    id: number;
}

export interface DotOpts {
    values: boolean;
    dir: string;
    font: string;
    fontsize: string;
    text: string;
    color: Record<NodeType, string>;
}