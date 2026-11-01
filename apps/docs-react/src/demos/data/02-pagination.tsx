export const meta = {
  title: "Pagination and loading",
  description:
    "The table shows the page you give it; fetch each page however you like. loading keeps the rows visible under an overlay."
};

import { useEffect, useState } from "react";

import { Table, type TableColumn } from "@boltronx/react-ui";

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
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // The current rows stay up under the loading overlay until the next page arrives.
  useEffect(() => {
    let current = true;
    setLoading(true);
    void fetchPage(page).then(next => {
      if (!current) return;
      setRows(next);
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [page]);

  return (
    <Table
      aria-label="Inventory"
      columns={columns}
      data={rows}
      rowKey={item => item.sku}
      loading={loading}
      minWidth="24rem"
      pagination={{
        page,
        pageSize: PAGE_SIZE,
        totalItems: ALL.length,
        onChange: setPage,
        itemName: "item"
      }}
    />
  );
}
