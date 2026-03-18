/**
 * Workflow builder: trigger, rule, and action definitions for the visual editor.
 * Stored graph is persisted in automation.trigger_config._workflow.
 */

export type NodeKind = "trigger" | "rule" | "action";

export const TRIGGERS = [
  { id: "subscriber_joins_group", label: "When subscriber joins a group" },
  { id: "subscriber_completes_form", label: "When subscriber completes a form" },
  { id: "subscriber_clicks_link", label: "When subscriber clicks a link" },
  { id: "subscriber_opens_email", label: "When subscriber opens an email" },
  { id: "subscriber_created", label: "When a subscriber is created" },
  { id: "subscriber_field_updated", label: "When subscriber field is updated" },
  { id: "subscriber_anniversary", label: "When subscriber anniversary date occurs" },
  { id: "specific_date", label: "When specific date occurs" },
  { id: "subscriber_joins_landing_page", label: "When subscriber joins via landing page" },
  { id: "purchase_occurs", label: "When purchase occurs" },
] as const;

export const RULES = [
  { id: "opened_email", label: "If subscriber opened email" },
  { id: "not_opened_email", label: "If subscriber did not open email" },
  { id: "clicked_link", label: "If subscriber clicked link" },
  { id: "not_clicked_link", label: "If subscriber did not click link" },
  { id: "belongs_to_group", label: "If subscriber belongs to group" },
  { id: "not_belongs_to_group", label: "If subscriber does not belong to group" },
  { id: "custom_field_equals", label: "If custom field equals value" },
  { id: "custom_field_not_equals", label: "If custom field does not equal value" },
  { id: "location_country", label: "If subscriber location is specific country" },
  { id: "has_tag", label: "If subscriber has specific tag" },
] as const;

export const ACTIONS = [
  { id: "send_email", label: "Send email" },
  { id: "delay", label: "Delay / wait for specific time" },
  { id: "add_to_group", label: "Add subscriber to group" },
  { id: "remove_from_group", label: "Remove subscriber from group" },
  { id: "update_field", label: "Update subscriber field" },
  { id: "move_to_step", label: "Move subscriber to another automation step" },
  { id: "mark_unsubscribed", label: "Mark subscriber as unsubscribed" },
  { id: "end_workflow", label: "End workflow" },
] as const;

export type TriggerId = (typeof TRIGGERS)[number]["id"];
export type RuleId = (typeof RULES)[number]["id"];
export type ActionId = (typeof ACTIONS)[number]["id"];

/** Payload shapes per node type (for config panel) */
export type TriggerPayload = {
  trigger_type: string;
  group_id?: number;
  form_id?: number;
  link_url?: string;
  campaign_id?: number;
  field_key?: string;
  date?: string;
  [key: string]: unknown;
};

export type RulePayload = {
  rule_type: string;
  group_id?: number;
  field_key?: string;
  field_value?: string;
  country?: string;
  tag_id?: number;
  campaign_id?: number;
  [key: string]: unknown;
};

export type ActionPayload = {
  step_type: string;
  subject?: string;
  html?: string;
  delay_minutes?: number;
  group_id?: number;
  field_key?: string;
  field_value?: string;
  [key: string]: unknown;
};

export type WorkflowNodeData = {
  label: string;
  kind: NodeKind;
  trigger_type?: TriggerId;
  rule_type?: RuleId;
  step_type?: ActionId;
  payload?: TriggerPayload | RulePayload | ActionPayload;
};

export type WorkflowGraph = {
  nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: WorkflowNodeData }>;
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null }>;
};
