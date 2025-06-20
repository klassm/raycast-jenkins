import { useEffect, useState } from "react";
import { search } from "../search/search";
import type { Job } from "../types/Job";
import { useJobs } from "./useJobs";
import { useMostUsed } from "./useMostUsed";

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
