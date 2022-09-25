import { countBy, keyBy, sortBy, takeRight } from "lodash";
import { Job } from "../types/Job";
import { useCache } from "./useCache";
import { useMemo } from "react";

function getMostUsed(jobs: Job[]): Job[] {
  const lookupRepositories = keyBy(jobs, (job) => job.url);
  const countEntries = Object.entries(countBy(jobs, (job) => job.url));
  return sortBy(countEntries, ([_entry, count]) => count)
    .reverse()
    .slice(0, 20)
    .map(([id]) => lookupRepositories[id])
    .filter((job): job is Job => job !== undefined);
}

function updateLastUsed(oldData: Job[], newEntry: Job): Job[] {
  const newEntries = [...oldData, newEntry];
  return takeRight(newEntries, 100);
}

export function useMostUsed() {
  const { data, update } = useCache<Job[]>("jenkins-most-used", async () => [], {
    expirationMillis: 1000 * 60 * 24 * 60,
  });
  const mostUsed = useMemo(() => getMostUsed(data ?? []), [data]);

  return { mostUsed, add: (job: Job) => update(updateLastUsed(data ?? [], job)) };
}
