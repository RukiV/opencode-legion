import { ITSPartialRecord } from "ts-type";
import { EnumAriseTools } from "../tools/tool-names";
import { IReturnTypeOfPluginToolArise } from "./opencode";

export type IReturnHasPlugin<T extends string> = ITSPartialRecord<T, string[]>;

export type IAriseTools = {
  [k in EnumAriseTools]: IReturnTypeOfPluginToolArise<k>;
};
