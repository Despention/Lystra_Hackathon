import type { Issue } from '../types/analysis';

export type RootStackParamList = {
  MainTabs: undefined;
  Upload: undefined;
  Analysis: { analysisId: string };
  Result: { analysisId: string };
  IssueDetail: { issue: Issue };
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};
