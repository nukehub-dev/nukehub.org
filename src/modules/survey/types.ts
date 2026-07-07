export interface SurveyQuestion {
  id: string;
  type:
    | "text"
    | "textarea"
    | "email"
    | "number"
    | "url"
    | "select"
    | "radio"
    | "checkbox"
    | "rating";
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<string | { label: string; value: string }>;
  min?: number;
  max?: number;
  maxLength?: number;
  maxSelections?: number;
  image?: string;
  video?: string;
}

export interface SurveyPage {
  title: string;
  description?: string;
  image?: string;
  questions: SurveyQuestion[];
}

export interface Survey {
  title: string;
  description?: string;
  slug?: string;
  intro?: string;
  outro?: string;
  successMessage?: string;
  submitLabel?: string;
  pages?: SurveyPage[];
  questions?: SurveyQuestion[];
}

export type SurveyResponse = Record<string, string | string[]>;
