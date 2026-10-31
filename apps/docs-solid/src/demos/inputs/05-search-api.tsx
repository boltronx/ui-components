export const meta = {
  title: "Searching an API",
  description:
    'onSearch runs once typing pauses (onSearchDebounceMs, default 300ms), right away on Enter, and with "" when cleared. Pass its signal to fetch so a slow, stale response is dropped. onInput stays the native event.'
};

import { createSignal, For, Show } from "solid-js";

import { InputSearch, Loader, Stack, Text } from "@boltronx/solid-ui";

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
  const [results, setResults] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [requests, setRequests] = createSignal(0);

  const search = (query: string, signal: AbortSignal) => {
    if (!query) return setResults([]);
    setRequests(count => count + 1);
    setLoading(true);
    searchFruits(query, signal)
      .then(setResults)
      .catch(() => {})
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
  };

  return (
    <Stack style={{ "max-width": "20rem" }}>
      <InputSearch label="Fruit" placeholder="Try “ap”" onSearch={search} onSearchMinLength={2} />
      <Text size="sm" c="dimmed">
        Requests sent: {requests()}
      </Text>
      <Show when={!loading()} fallback={<Loader size="xs" />}>
        <For each={results()}>{fruit => <Text>{fruit}</Text>}</For>
      </Show>
    </Stack>
  );
}
