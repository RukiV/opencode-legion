import { EnumAriseTools } from "../tools/tool-names";
import { IReturnTypeOfPluginToolArise } from "./opencode";

export type IReturnHasPlugin<T extends string> = Record<T, undefined | string[]>;

export type IAriseTools = {
  [k in EnumAriseTools]: IReturnTypeOfPluginToolArise<k>;
};
