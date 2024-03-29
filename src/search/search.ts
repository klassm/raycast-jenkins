import { sortBy, sum } from "lodash";
import replaceSpecialCharacters from "replace-special-characters";
import { Job } from "../types/Job";
import { SearchableJob } from "./SearchableJob";

export function toSearchableJob(job: Job): SearchableJob {
  const searchKeywords = [job.name, ...job.path].map(toKeywords).flat();
  return {
    ...job,
    searchKeywords,
  };
}

export function search(query: string, data: SearchableJob[]): SearchableJob[] {
  const queryParts = toKeywords(query);
  const withScore = data
    .map((entry) => ({
      ...entry,
      score: searchScoreFor(queryParts, entry),
    }))
    .filter((entry) => entry.score > 0);

  const sorted = sortBy(withScore, (entry) => entry.score).reverse();
  return sorted.slice(0, 20);
}

function searchScoreFor(queryParts: string[], { searchKeywords }: SearchableJob): number {
  const allPartsMatch = queryParts.every((part) => searchKeywords.some((keyword) => keyword.includes(part)));
  if (!allPartsMatch) {
    return -1;
  }

  const keywordScores = searchKeywords.map((keyword) => {
    const part = queryParts.find((part) => keyword.includes(part));
    return part ? part.length / keyword.length : 0;
  });

  return sum(keywordScores) / searchKeywords.length;
}

function normalize(value: string): string {
  return replaceSpecialCharacters(value).toLowerCase().normalize();
}

export function toKeywords(value: string): string[] {
  return normalize(value).split(/[-_ ]/);
}
