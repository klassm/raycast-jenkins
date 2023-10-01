import { Action, ActionPanel, List } from "@raycast/api";
import { useSearch } from "../hooks/useSearch";
import { Job } from "../types/Job";

export function JobList() {
  const { searchResults, setQuery, loading, updateMostUsed } = useSearch();

  return (
    <List
      isLoading={loading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Jenkins..."
      throttle
    >
      {(searchResults ?? []).map((job) => (
        <JenkinsJob key={job.url} job={job} updateMostUsed={() => updateMostUsed(job)} />
      ))}
    </List>
  );
}

function JenkinsJob({ job, updateMostUsed }: { job: Job; updateMostUsed: () => void }) {
  const path = job.path.reverse().join(" ⬅ ");
  const icon = `${__dirname}/assets/${job.icon}`;
  return (
    <List.Item
      title={job.name}
      subtitle={path}
      icon={icon}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser onOpen={updateMostUsed} title="Open" url={job.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
