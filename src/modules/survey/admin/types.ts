export interface SurveySummary {
  slug: string;
  title: string;
  count: number;
  latestAt: string;
}

export interface Submission {
  id: number;
  submittedAt: string;
  email: string;
  responses: Record<string, string>;
}

export interface SubmissionsResponse {
  slug: string;
  page: number;
  limit: number;
  total: number;
  submissions: Submission[];
}

export interface Distribution {
  value: string;
  count: number;
}

export interface SurveyStats {
  slug: string;
  total: number;
  daily: Record<string, number>;
  distributions: Record<string, Distribution[]>;
}

export interface AdminApiError {
  message: string;
  status: number;
}
