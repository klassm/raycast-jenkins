import { loadAllJobs } from "../jenkins/loadAllJobs";
import { useCache } from "./useCache";
import { useConfig } from "./useConfig";

export function useJobs() {
  const config = useConfig();
  const { data, loading } = useCache("jenkins-jobs", async () => loadAllJobs(config), {
    expirationMillis: 1000 * 60 * 60 * 24,
  });
  return { repositories: data, loading };
}
