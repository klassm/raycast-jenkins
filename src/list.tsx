import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { sortBy, sum } from "lodash";
import { useEffect, useState } from "react";
import replaceSpecialCharacters from "replace-special-characters"
import { Job, queryAll } from "./jenkins";


const useData = () => {
  const [data, setData] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const { url, username, password } = getPreferenceValues();

  useEffect(() => {
    setLoading(true);
    queryAll(url, { username, password })
      .then(setData)
    setData(data);
    setLoading(false);
  }, []);

  return { data, loading };
}

const normalize = (value: string): string => {
  return replaceSpecialCharacters(value).toLowerCase().normalize();
}

const split = (value: string): string[] => normalize(value).split(/[-_]/)

const searchScoreFor = (queryParts: string[], data: Job): number => {
  const keywords = [...split(data.name), ...(data.path.flatMap(split))];
  const allPartsMatch = queryParts.every(part => keywords.some(keyword => keyword.includes(part)));
  if (!allPartsMatch) {
    return -1;
  }

  const keywordScores = keywords.map(keyword => {
    const part = queryParts.find(part => keyword.includes(part));
    return part ? part.length / keyword.length : 0;
  })

  return sum(keywordScores) / keywords.length;
}

const search = (query: string, data: Job[]): Job[] => {
  const queryParts = normalize(query).split(/[ -_]/);
  const withScore = data
    .map(entry => ( {
      ...entry,
      score: searchScoreFor(queryParts, entry)
    } ))
    .filter(entry => entry.score > 0);

  const sorted = sortBy(withScore, entry => entry.score).reverse();
  return sorted.slice(0, 20);
}

export default function JenkinsList() {
  const { data, loading } = useData()
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<Job[]>([]);

  useEffect(() => {
    const results = search(searchText, data)
    setSearchResults(results);
  }, [searchText]);

  return (
    <List isLoading={ loading } enableFiltering={ false } searchText={ searchText }
          onSearchTextChange={ setSearchText } searchBarPlaceholder="Search Jenkins..." throttle>
      { ( searchResults ?? [] ).map((job) => (
        <JenkinsJob key={ job.url } job={ job }/>
      )) }
    </List>
  );
}


function JenkinsJob({ job }: { job: Job }) {
  const path = job.path.reverse().join(" ⬅ ");
  const icon = `${ __dirname }/assets/${ job.icon }`;
  console.log(icon);
  return (
    <List.Item
      title={ job.name }
      subtitle={ path }
      icon={ icon }
      actions={ (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open" url={ job.url }/>
          </ActionPanel.Section>
        </ActionPanel>
      ) }
    />
  );
}
