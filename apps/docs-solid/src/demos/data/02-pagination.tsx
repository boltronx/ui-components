export const meta = {
  title: "Pagination and loading",
  description:
    "The table shows the page you give it; fetch each page however you like. loading keeps the rows visible under an overlay."
};

import { createResource, createSignal } from "solid-js";

import { Table, type TableColumn } from "@boltronx/solid-ui";

interface Item {
  sku: string;
  name: string;
  stock: number;
}

const ALL: Item[] = Array.from({ length: 87 }, (_, i) => ({
  sku: `SKU-${String(i + 1).padStart(4, "0")}`,
  name: ["Cement", "Steel bars", "Plywood", "Gravel", "Paint"][i % 5]!,
  stock: (i * 37) % 500
}));
const PAGE_SIZE = 8;

/** Stands in for a server request. */
async function fetchPage(page: number): Promise<Item[]> {
  await new Promise(resolve => setTimeout(resolve, 400));
  return ALL.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

const columns: TableColumn<Item>[] = [
  { header: "SKU", render: item => item.sku, width: "8rem" },
  { header: "Name", render: item => item.name },
  { header: "In stock", render: item => item.stock.toLocaleString(), align: "right" }
];

export default function Demo() {
  const [page, setPage] = createSignal(1);
  const [rows] = createResource(page, fetchPage, { initialValue: [] });

  return (
    <Table
      aria-label="Inventory"
      columns={columns}
      data={rows.latest}
      loading={rows.loading}
      minWidth="24rem"
      pagination={{
        page: page(),
        pageSize: PAGE_SIZE,
        totalItems: ALL.length,
        onChange: setPage,
        itemName: "item"
      }}
    />
  );
}
