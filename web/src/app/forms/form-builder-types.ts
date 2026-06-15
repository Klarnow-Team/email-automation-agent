/**
 * Form builder: field types and config for MailerLite-style editor.
 * Stored in form.fields as array of FormFieldConfig.
 */

export type FormFieldType =
  | "email"
  | "name"
  | "phone"
  | "text"
  | "textarea"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "hidden"
  | "gdpr"
  | "submit";

export interface FormFieldConfig {
  id: string;
  type: FormFieldType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  default?: string;
  options?: string[]; // for dropdown, radio
  width?: "full" | "half";
  key?: string; // custom field mapping / submit key
  /** GDPR consent text */
  consentText?: string;
}

export const FIELD_TYPES: { type: FormFieldType; label: string }[] = [
  { type: "email", label: "Email" },
  { type: "name", label: "Name" },
  { type: "phone", label: "Phone number" },
  { type: "text", label: "Text input" },
  { type: "textarea", label: "Text area" },
  { type: "dropdown", label: "Dropdown" },
  { type: "checkbox", label: "Checkbox" },
  { type: "radio", label: "Radio buttons" },
  { type: "hidden", label: "Hidden field" },
  { type: "gdpr", label: "GDPR / consent" },
  { type: "submit", label: "Submit button" },
];

const DEFAULT_LABELS: Partial<Record<FormFieldType, string>> = {
  email: "Email",
  name: "Name",
  phone: "Phone",
  text: "Text",
  textarea: "Message",
  dropdown: "Select",
  checkbox: "Checkbox",
  radio: "Choose one",
  hidden: "Hidden",
  gdpr: "I agree to the privacy policy",
  submit: "Subscribe",
};

export function defaultFieldKey(type: FormFieldType): string {
  if (type === "email") return "email";
  if (type === "name") return "name";
  if (type === "phone") return "phone";
  return "";
}

export function getDefaultLabel(type: FormFieldType): string {
  return DEFAULT_LABELS[type] ?? type;
}

export function createField(type: FormFieldType): FormFieldConfig {
  const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const label = getDefaultLabel(type);
  const key = defaultFieldKey(type);
  const base: FormFieldConfig = { id, type, label, required: type === "email", width: "full" };
  if (key) base.key = key;
  if (type === "dropdown" || type === "radio") base.options = ["Option 1", "Option 2"];
  if (type === "gdpr") base.consentText = "I agree to receive emails and accept the privacy policy.";
  return base;
}
