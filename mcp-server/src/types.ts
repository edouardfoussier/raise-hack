export type Classification =
  | "intentional_redesign"
  | "accidental_regression"
  | "platform_constraint";

export interface DriftVerdict {
  /** What kind of change this is. */
  classification: Classification;
  /** Plain-language, design-system-grounded explanation of WHY. */
  reasoning: string;
  /** A unified diff (or code snippet) that reconciles the drift. Empty if none needed. */
  proposed_diff: string;
  /** 0..1 self-reported confidence. */
  confidence: number;
}

export interface RenderResult {
  beforePngPath: string;
  afterPngPath: string;
  beforePngBase64: string;
  afterPngBase64: string;
}
