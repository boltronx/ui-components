export const meta = { title: "Empty state" };

import { Table } from "@boltronx/react-ui";

export default function Demo() {
  return (
    <Table
      columns={[
        { header: "Name", render: () => null },
        { header: "Email", render: () => null }
      ]}
      data={[]}
      emptyMessage="No customers yet"
      emptyDescription="Customers you add will show up here."
    />
  );
}
