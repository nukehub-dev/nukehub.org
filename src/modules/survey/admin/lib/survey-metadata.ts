import type { Survey, SurveyQuestion } from "../../types";

export interface QuestionMeta {
  id: string;
  label: string;
  type: SurveyQuestion["type"];
  options?: Array<string | { label: string; value: string }>;
}

export function buildQuestionMap(
  survey: Survey | undefined,
): Map<string, QuestionMeta> {
  const map = new Map<string, QuestionMeta>();
  if (!survey) return map;

  const addQuestion = (q: SurveyQuestion) => {
    if (!map.has(q.id)) {
      map.set(q.id, {
        id: q.id,
        label: q.label || q.id,
        type: q.type,
        options: q.options,
      });
    }
  };

  if (survey.questions) {
    survey.questions.forEach(addQuestion);
  }
  if (survey.pages) {
    survey.pages.forEach((page) => page.questions.forEach(addQuestion));
  }

  return map;
}

export function getQuestionLabel(
  map: Map<string, QuestionMeta>,
  id: string,
): string {
  return map.get(id)?.label || id;
}
