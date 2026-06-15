export { TriggerNode } from "./TriggerNode";
export { RuleNode } from "./RuleNode";
export { ActionNode } from "./ActionNode";

import type { NodeTypes } from "@xyflow/react";
import { TriggerNode } from "./TriggerNode";
import { RuleNode } from "./RuleNode";
import { ActionNode } from "./ActionNode";

export const workflowNodeTypes: NodeTypes = {
  trigger: TriggerNode,
  rule: RuleNode,
  action: ActionNode,
};
