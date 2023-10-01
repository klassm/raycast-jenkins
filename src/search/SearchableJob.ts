import { Job } from "../types/Job";

export interface SearchableJob extends Job {
  searchKeywords: string[];
}
