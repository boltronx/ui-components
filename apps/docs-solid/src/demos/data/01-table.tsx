export const meta = {
  title: "Table",
  description:
    "Fixed columns stay put while the table scrolls sideways. Click a row to open it; the actions menu keeps its own clicks. rowLabel names the row's action, so keyboard and screen reader users reach an 'Open order' button in each row (or put a link of your own in a cell). Narrow the window: below 576px of table width, rows become cards."
};

import {
  IconButton,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  message,
  Table,
  type TableColumn,
  Text
} from "@boltronx/solid-ui";
import { IconDotsVertical } from "@tabler/icons-solidjs";

interface Order {
  id: string;
  customer: string;
  city: string;
  status: "Paid" | "Pending" | "Refunded";
  date: string;
  total: number;
}

const orders: Order[] = [
  {
    id: "SO-1042",
    customer: "Ada Lovelace",
    city: "Manila",
    status: "Paid",
    date: "Oct 2, 2026",
    total: 12500
  },
  {
    id: "SO-1043",
    customer: "Grace Hopper",
    city: "Cebu",
    status: "Pending",
    date: "Oct 3, 2026",
    total: 4800
  },
  {
    id: "SO-1044",
    customer: "Alan Turing",
    city: "Davao",
    status: "Paid",
    date: "Oct 5, 2026",
    total: 31250.5
  },
  {
    id: "SO-1045",
    customer: "Katherine Johnson",
    city: "Iloilo",
    status: "Refunded",
    date: "Oct 6, 2026",
    total: 920
  }
];

const peso = new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP" });
const statusColor = { Paid: "success", Pending: "warning", Refunded: "dimmed" } as const;

const columns: TableColumn<Order>[] = [
  {
    header: "Order",
    render: order => <Text fw={600}>{order.id}</Text>,
    fixed: "left",
    width: "7rem"
  },
  { header: "Customer", render: order => order.customer, minWidth: "11rem" },
  { header: "City", render: order => order.city },
  {
    header: "Status",
    render: order => (
      <Text component="span" c={statusColor[order.status]} fw={600}>
        {order.status}
      </Text>
    )
  },
  { header: "Date", render: order => order.date, minWidth: "7rem" },
  { header: "Total", render: order => peso.format(order.total), align: "right", minWidth: "8rem" },
  {
    // Named for screen readers; an empty header leaves the column unlabeled.
    header: <span class="bx-visually-hidden">Actions</span>,
    width: "3rem",
    fixed: "right",
    stacked: "corner",
    render: order => (
      <Menu position="bottom-end">
        <MenuTarget>
          <IconButton aria-label={`Actions for ${order.id}`}>
            <IconDotsVertical />
          </IconButton>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem onClick={() => message.info(`Opened ${order.id}`)}>Open</MenuItem>
          <MenuItem danger onClick={() => message.error(`Cancelled ${order.id}`)}>
            Cancel
          </MenuItem>
        </MenuDropdown>
      </Menu>
    )
  }
];

export default function Demo() {
  return (
    <Table
      aria-label="Orders"
      columns={columns}
      data={orders}
      minWidth="48rem"
      onRowClick={order => message.info(`Opened ${order.id}`)}
      rowLabel={order => `Open order ${order.id}`}
    />
  );
}
