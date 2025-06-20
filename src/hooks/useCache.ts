import { Cache, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

const cache = new Cache();

export type CacheProvider<T> = () => Promise<T>;

export interface CacheOptions {
	expirationMillis: number;
}

interface CacheData<T> {
	lastModified: number;
	data: T;
}

function loadExistingData<T>(cacheKey: string): CacheData<T> | undefined {
	const cachedData = cache.get(cacheKey);
	return cachedData === undefined ? undefined : JSON.parse(cachedData);
}

async function loadData<T>(
	cacheKey: string,
	provider: CacheProvider<T>,
): Promise<CacheData<T> | undefined> {
	const data = await provider();
	if (!(Array.isArray(data) && data.length === 0)) {
		return updateData(cacheKey, data);
	}
	return undefined;
}

function updateData<T>(cacheKey: string, newData: T): CacheData<T> {
	const saveData = {
		lastModified: Date.now(),
		data: newData,
	};
	cache.set(cacheKey, JSON.stringify(saveData));
	return saveData;
}

export function useCache<T>(
	key: string,
	provider: CacheProvider<T>,
	options: CacheOptions,
) {
	const [data, setData] = useState<CacheData<T> | undefined>(() =>
		loadExistingData(key),
	);
	const [loading, setLoading] = useState<boolean>(false);

	const reloadData = useMemo(
		() => () => {
			setLoading(true);
			loadData(key, provider)
				.then(setData)
				.catch(async (error) => {
					await showToast({
						style: Toast.Style.Failure,
						title: "Reload data failed",
						message: error.message,
					});
				})
				.finally(() => setLoading(false));
		},
		[loadData, setLoading],
	);

	const update = useMemo(
		() => (newData: T) => {
			updateData(key, newData);
			reloadData();
		},
		[updateData, reloadData],
	);
	useEffect(() => {
		const now = Date.now();
		if (
			data !== undefined &&
			now - data.lastModified < options.expirationMillis
		) {
			return;
		}
		reloadData();
	}, []);

	return {
		data: data?.data,
		loading,
		update,
	};
}
