export const meta = {
  title: "Server search",
  description:
    "onSearchChange runs once typing pauses (300ms by default), only from 3 characters here (onSearchChangeMinLength, as trigram search needs), and its signal cancels a request a newer search has replaced. The fake API below takes 600ms; watch the request log."
};

import { createSignal, For } from "solid-js";

import {
  Autocomplete,
  Select,
  type SelectOption,
  SimpleGrid,
  Stack,
  Text
} from "@boltronx/solid-ui";

const cities = [
  "Amsterdam",
  "Berlin",
  "Lisbon",
  "Madrid",
  "Manila",
  "Paris",
  "Prague",
  "Rome",
  "Tokyo",
  "Vienna"
].map(label => ({ value: label.toLowerCase().replace(/\s+/g, "-"), label }));

/** A stand-in for fetch(url, { signal }): slow, and it stops when aborted. */
function searchCities(query: string, signal: AbortSignal): Promise<SelectOption[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase();
      resolve(q ? cities.filter(city => city.label.toLowerCase().includes(q)) : cities.slice(0, 5));
    }, 600);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/** Options, loading state and a request log for one field. */
function createCitySearch(log: (line: string) => void) {
  const [options, setOptions] = createSignal(cities.slice(0, 5));
  const [loading, setLoading] = createSignal(false);
  const search = (query: string, signal: AbortSignal) => {
    log(`request "${query}"`);
    signal.addEventListener("abort", () => log(`cancelled "${query}"`));
    setLoading(true);
    searchCities(query, signal)
      .then(setOptions)
      .catch(() => {})
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
  };
  return { options, loading, search };
}

export default function Demo() {
  const [lines, setLines] = createSignal<string[]>([]);
  const log = (line: string) => setLines(prev => [line, ...prev].slice(0, 6));
  const select = createCitySearch(line => log(`Select: ${line}`));
  const autocomplete = createCitySearch(line => log(`Autocomplete: ${line}`));

  return (
    <Stack>
      <SimpleGrid minChildWidth="14rem">
        <Select
          label="City"
          searchable
          options={select.options()}
          loading={select.loading()}
          onSearchChange={select.search}
          onSearchChangeMinLength={3}
        />
        <Autocomplete
          label="City (free text)"
          options={autocomplete.options()}
          loading={autocomplete.loading()}
          onSearchChange={autocomplete.search}
          onSearchChangeMinLength={3}
        />
      </SimpleGrid>
      <Stack gap={2}>
        <For each={lines()} fallback={<Text c="dimmed">No requests yet.</Text>}>
          {line => (
            <Text size="sm" c="dimmed">
              {line}
            </Text>
          )}
        </For>
      </Stack>
    </Stack>
  );
}
