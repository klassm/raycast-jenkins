import { sortBy, sum } from "lodash";
import { useEffect, useState } from "react";
import replaceSpecialCharacters from "replace-special-characters";
import { Job } from "../types/Job";
import { useJobs } from "./useJobs";
import { useMostUsed } from "./useMostUsed";

function toKeywords(value: string): string[] {
  return value.toLowerCase().split(/[- _]/);
}

function normalize(value: string): string {
  return replaceSpecialCharacters(value).toLowerCase().normalize();
}

function split(value: string): string[] {
  return normalize(value).split(/[-_]/);
}

const searchScoreFor = (queryParts: string[], job: Job): number => {
  const keywords = [...split(job.name), ...job.path.flatMap(split)];
  const allPartsMatch = queryParts.every((part) => keywords.some((keyword) => keyword.includes(part)));
  if (!allPartsMatch) {
    return -1;
  }

  const keywordScores = keywords.map((keyword) => {
    const part = queryParts.find((part) => keyword.includes(part));
    return part ? part.length / keyword.length : 0;
  });

  return sum(keywordScores) / keywords.length;
};

const search = (query: string, data: Job[]): Job[] => {
  const queryParts = toKeywords(query);
  const withScore = data
    .map((entry) => ({
      ...entry,
      score: searchScoreFor(queryParts, entry),
    }))
    .filter((entry) => entry.score > 0);

  const sorted = sortBy(withScore, (entry) => entry.score).reverse();
  return sorted.slice(0, 20);
};

export function useSearch() {
  const { repositories = [], loading } = useJobs();
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const { mostUsed, add: updateMostUsed } = useMostUsed();

  useEffect(() => {
    if (query) {
      setSearchResults(search(query, repositories));
    } else {
      setSearchResults(mostUsed);
    }
  }, [query, repositories]);

  return { loading, searchResults, setQuery, updateMostUsed };
}
