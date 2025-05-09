import { compact } from "lodash";
import fetch from "node-fetch";
import { Config } from "../types/Config";
import { Job } from "../types/Job";

interface JenkinsJobs {
  jobs: JenkinsJob[];
}

interface JenkinsJob extends JenkinsJobs {
  name: string;
  healthReport: HealthReport[];
  url: string;
  color: string;
}

interface HealthReport {
  description: string;
  iconUrl: string;
  score: number;
}

interface CrumbResponse {
  crumbRequestField: string;
  crumb: string;
}

function isJenkinsResult(result: unknown): result is JenkinsJobs {
  return (result as JenkinsJobs).jobs !== undefined;
}

function iconFor(score: number, iconUrl: string, color: string): string {
  const sanitizedColor = sanitizeColor(color);
  if (iconUrl) {
    return iconUrl;
  }
  const icon = iconForHealthAndColor(score, sanitizedColor);
  if (color && icon) {
    return icon;
  }

  return `images/${color}.png`;
}

function sanitizeColor(color: string): string {
  switch (color) {
    case "notbuilt":
    case "disabled":
      return "grey";
    default:
      return color;
  }
}

function iconForHealthAndColor(score: number, color: string) {
  if (score === undefined) {
    return undefined;
  }

  if (score >= 0 && score <= 20) {
    return `health-00to19-${color}.png`;
  }
  if (score > 20 && score <= 40) {
    return `health-20to39-${color}.png`;
  }
  if (score > 40 && score <= 60) {
    return `health-40to59-${color}.png`;
  }
  if (score > 60 && score <= 80) {
    return `health-60to79-${color}.png`;
  }
  if (score > 80) {
    return `health-80plus-${color}.png`;
  }
  return undefined;
}

function mapData(data: JenkinsJob, parent: Job | undefined = undefined, level = 0): Job[] {
  const name = data.name.replace("%2F", "/");
  const healthReport = data.healthReport[0];
  const healthScore = healthReport?.score;
  const iconUrl = healthReport?.iconUrl;

  const job: Job = {
    name,
    url: data.url,
    icon: iconFor(healthScore, iconUrl, data.color),
    description: healthReport?.description,
    level,
    path: compact([...(parent?.path ?? []), parent?.name]),
  };

  const hasChildJobs = data.jobs && typeof data.jobs === "object";
  const children = hasChildJobs ? data.jobs.flatMap((child) => mapData(child, job, level + 1)) : [];
  return [job, ...children];
}

export async function loadAllJobs({ url, username, password }: Config): Promise<Job[]> {
  const credentials = `${username}:${password}`;
  const base64Credentials = Buffer.from(credentials).toString("base64");
  const authHeader = `Basic ${base64Credentials}`;

  async function getCrumb(): Promise<CrumbResponse> {
    const response = await fetch(`${url}/crumbIssuer/api/json`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });
    if (response.status !== 200) {
      throw new Error("failed to get crumb: " + response.statusText);
    }
    return (await response.json()) as CrumbResponse;
  }

  const { crumb, crumbRequestField } = await getCrumb();

  const result = await fetch(
    `${url}/api/json?depth=10&tree=jobs[name,url,color,healthReport[description,score,iconUrl],jobs[name,url,color,healthReport[description,score,iconUrl],jobs[name,url,color,healthReport[description,score,iconUrl]]]]`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        [crumbRequestField]: crumb,
      },
    }
  );
  if (result.status !== 200) {
    console.log("Status was ", result.status, result.statusText, await result.text());
    return [];
  }
  const json = await result.json();
  if (isJenkinsResult(json)) {
    return json.jobs.flatMap((job) => mapData(job));
  }
  return [];
}
