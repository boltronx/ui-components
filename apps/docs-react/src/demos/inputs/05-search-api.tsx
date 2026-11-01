export const meta = {
  title: "Searching an API",
  description:
    'onSearch runs once typing pauses (onSearchDebounceMs, default 300ms), right away on Enter, and with "" when cleared. Pass its signal to fetch so a slow, stale response is dropped. onChange still fires on every keystroke.'
};

import { useState } from "react";

import { InputSearch, Loader, Stack, Text } from "@boltronx/react-ui";

const fruits = ["Apple", "Apricot", "Banana", "Blueberry", "Cherry", "Grape", "Mango", "Papaya"];

/** A stand-in for fetch(url, { signal }): slow, and it stops when aborted. */
function searchFruits(query: string, signal: AbortSignal): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase();
      resolve(q ? fruits.filter(fruit => fruit.toLowerCase().includes(q)) : []);
    }, 500);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

export default function Demo() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState(0);

  const search = (query: string, signal: AbortSignal) => {
    if (!query) {
      setLoading(false);
      return setResults([]);
    }
    setRequests(count => count + 1);
    setLoading(true);
    signal.addEventListener("abort", () => setLoading(false), { once: true });
    searchFruits(query, signal)
      .then(setResults)
      .catch(() => {})
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
  };

  return (
    <Stack style={{ maxWidth: "20rem" }}>
      <InputSearch label="Fruit" placeholder="Try “ap”" onSearch={search} onSearchMinLength={2} />
      <Text size="sm" c="dimmed">
        Requests sent: {requests}
      </Text>
      {loading ? <Loader size="xs" /> : results.map(fruit => <Text key={fruit}>{fruit}</Text>)}
    </Stack>
  );
}
