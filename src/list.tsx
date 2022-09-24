import { Action, ActionPanel, Cache, getPreferenceValues, List } from "@raycast/api";
import { countBy, keyBy, sortBy, sum, takeRight } from "lodash";
import { useEffect, useState } from "react";
import replaceSpecialCharacters from "replace-special-characters";
import { Job, queryAll } from "./jenkins";

const cache = new Cache();
const lastUsedCacheKey = "jenkins-last-used";

function getLastUsedCache(): string[] {
  return JSON.parse(cache.get(lastUsedCacheKey) ?? "[]");
}

function getMostUsed() {
  const values = getLastUsedCache();
  const countEntries = Object.entries(countBy(values));
  const sortedEntries = sortBy(countEntries, (entry) => entry[1])
    .reverse()
    .map(([href]) => href);
  return sortedEntries.slice(0, 20);
}

async function updateLastUsed(href: string) {
  const cachedEntries = getLastUsedCache();
  const newEntries = [...cachedEntries, href];
  const latestEntries = takeRight(newEntries, 100);

  cache.set(lastUsedCacheKey, JSON.stringify(latestEntries));
}

const useData = () => {
  const [data, setData] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const { url, username, password } = getPreferenceValues();
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<Job[]>([]);

  useEffect(() => {
    setLoading(true);
    queryAll(url, { username, password }).then(setData);
    setData(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (searchText) {
      setSearchResults(search(searchText, data));
    } else {
      const mostUsed = getMostUsed();
      const byUrl = keyBy(data, (job) => job.url);
      const filtered = mostUsed.map((href) => byUrl[href]).filter((job): job is Job => !!job);
      setSearchResults(filtered);
    }
  }, [searchText, data]);

  return { searchResults, loading, setSearchText };
};

const normalize = (value: string): string => {
  return replaceSpecialCharacters(value).toLowerCase().normalize();
};

const split = (value: string): string[] => normalize(value).split(/[-_]/);

const searchScoreFor = (queryParts: string[], data: Job): number => {
  const keywords = [...split(data.name), ...data.path.flatMap(split)];
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
  const queryParts = normalize(query).split(/[ -_]/);
  const withScore = data
    .map((entry) => ({
      ...entry,
      score: searchScoreFor(queryParts, entry),
    }))
    .filter((entry) => entry.score > 0);

  const sorted = sortBy(withScore, (entry) => entry.score).reverse();
  return sorted.slice(0, 20);
};

export default function JenkinsList() {
  const { searchResults, setSearchText, loading } = useData();

  return (
    <List
      isLoading={loading}
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Jenkins..."
      throttle
    >
      {(searchResults ?? []).map((job) => (
        <JenkinsJob key={job.url} job={job} />
      ))}
    </List>
  );
}

function JenkinsJob({ job }: { job: Job }) {
  const path = job.path.reverse().join(" ⬅ ");
  const icon = `${__dirname}/assets/${job.icon}`;
  console.log(icon);
  return (
    <List.Item
      title={job.name}
      subtitle={path}
      icon={icon}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser onOpen={() => updateLastUsed(job.url)} title="Open" url={job.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
