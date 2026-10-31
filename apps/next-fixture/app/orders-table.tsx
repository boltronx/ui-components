"use client";

// Table takes render functions, which can't be passed from a Server Component, so it is wrapped
// in a client component of the app's own.
import { Table } from "@boltronx/react-ui";

const orders = [
  { id: "A-1", total: 12 },
  { id: "A-2", total: 30 }
];

export function OrdersTable() {
  return (
    <Table
      aria-label="Orders"
      rowKey={order => order.id}
      columns={[
        { header: "Order", render: order => order.id },
        { header: "Total", render: order => `$${order.total}`, align: "right" }
      ]}
      data={orders}
    />
  );
}
