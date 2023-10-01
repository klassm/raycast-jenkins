import { loadAllJobs } from "../jenkins/loadAllJobs";
import { toSearchableJob } from "../search/search";
import { useCache } from "./useCache";
import { useConfig } from "./useConfig";

export function useJobs() {
  const config = useConfig();
  const { data, loading } = useCache(
    "jenkins-jobs",
    async () => {
      const jobs = await loadAllJobs(config);
      return jobs.map(toSearchableJob);
    },
    {
      expirationMillis: 1000 * 60 * 5,
    }
  );
  return { repositories: data, loading };
}
