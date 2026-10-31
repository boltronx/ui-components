import { screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderInForm } from "../../../test/helpers";

import { DatePicker } from "./DatePicker";
import { addMonths, calendarDays, parseISODate, toISODate } from "./dates";

describe("date helpers", () => {
  it("round-trips YYYY-MM-DD in local time and rejects invalid dates", () => {
    expect(toISODate(parseISODate("2026-03-09")!)).toBe("2026-03-09");
    expect(parseISODate("2026-02-30")).toBeUndefined();
    expect(parseISODate("not a date")).toBeUndefined();
  });

  it("keeps the day within the month when moving months", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("starts the calendar on the given first day of the week", () => {
    // Oct 1, 2026 is a Thursday
    expect(calendarDays("2026-10-15")[0]).toBe("2026-09-27");
    expect(calendarDays("2026-10-15", 1)[0]).toBe("2026-09-28");
  });
});

async function openCalendar() {
  await userEvent.click(screen.getByLabelText("Due date"));
}

describe("DatePicker", () => {
  it("shows the date formatted and submits it as YYYY-MM-DD", () => {
    const { data } = renderInForm(() => (
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" />
    ));
    expect(screen.getByLabelText("Due date")).toHaveValue("Oct 5, 2026");
    expect(data().get("due")).toBe("2026-10-05");
  });

  it("picks a day from the calendar", async () => {
    const onChange = vi.fn();
    const { data } = renderInForm(() => (
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" onChange={onChange} />
    ));
    await openCalendar();
    await userEvent.click(await screen.findByRole("button", { name: "Tuesday, October 20, 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-10-20");
    expect(data().get("due")).toBe("2026-10-20");
    expect(screen.getByLabelText("Due date")).toHaveValue("Oct 20, 2026");
  });

  it("opens from a click on its label, and closes from a click on the field", async () => {
    renderInForm(() => <DatePicker label="Due date" />);
    const field = screen.getByRole("combobox", { name: "Due date" });
    await userEvent.click(screen.getByText("Due date"));
    expect(field).toHaveAttribute("aria-expanded", "true");
    expect(field).toHaveFocus();
    await userEvent.click(field);
    expect(field).toHaveAttribute("aria-expanded", "false");
  });

  it("navigates with the keyboard", async () => {
    const { data } = renderInForm(() => (
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" />
    ));
    screen.getByLabelText("Due date").focus();
    await userEvent.keyboard("{Enter}{ArrowRight}{ArrowDown}{Enter}");
    expect(data().get("due")).toBe("2026-10-13");
  });

  it("drills from years to months to days", async () => {
    const { data } = renderInForm(() => (
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" />
    ));
    await openCalendar();
    await userEvent.click(await screen.findByRole("button", { name: "October 2026" }));
    await userEvent.click(screen.getByRole("button", { name: "2026" }));
    await userEvent.click(screen.getByRole("button", { name: "2024" }));
    await userEvent.click(screen.getByRole("button", { name: "March 2024" }));
    await userEvent.click(screen.getByRole("button", { name: "Friday, March 15, 2024" }));
    expect(data().get("due")).toBe("2024-03-15");
  });

  it("disables days outside min and max", async () => {
    renderInForm(() => (
      <DatePicker label="Due date" defaultValue="2026-10-10" min="2026-10-05" max="2026-10-20" />
    ));
    await openCalendar();
    expect(await screen.findByRole("button", { name: "Sunday, October 4, 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Monday, October 5, 2026" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Wednesday, October 21, 2026" })).toBeDisabled();
  });

  it("clears with Backspace only when clearable", async () => {
    const { data } = renderInForm(() => (
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" />
    ));
    screen.getByLabelText("Due date").focus();
    await userEvent.keyboard("{Backspace}");
    expect(data().get("due")).toBe("2026-10-05");
  });

  it("restores defaultValue on form reset and clears with Backspace", async () => {
    const { data, reset } = renderInForm(() => (
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" clearable />
    ));
    screen.getByLabelText("Due date").focus();
    await userEvent.keyboard("{Backspace}");
    expect(data().get("due")).toBe("");
    await reset();
    expect(data().get("due")).toBe("2026-10-05");
    expect(screen.getByLabelText("Due date")).toHaveValue("Oct 5, 2026");
  });

  it("blocks the form when required and empty", () => {
    const { form } = renderInForm(() => <DatePicker label="Due date" name="due" required />);
    expect(form.checkValidity()).toBe(false);
  });

  it("can't be typed in", async () => {
    renderInForm(() => <DatePicker label="Due date" />);
    await userEvent.type(screen.getByLabelText("Due date"), "hello");
    expect(screen.getByLabelText("Due date")).toHaveValue("");
  });
});

describe("DatePicker opening", () => {
  it("opens on today when its value isn't a real date", async () => {
    renderInForm(() => <DatePicker label="Due date" value="2026-02-30" />);
    await openCalendar();
    const today = new Date();
    const name = new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(today);
    expect(await screen.findByRole("button", { name })).toHaveAttribute("data-today");
  });

  it("marks today as of the opening, not as of the first render", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(2026, 9, 5, 23, 59));
      renderInForm(() => <DatePicker label="Due date" />);
      vi.setSystemTime(new Date(2026, 9, 6, 0, 1));
      await openCalendar();
      expect(
        await screen.findByRole("button", { name: "Tuesday, October 6, 2026" })
      ).toHaveAttribute("data-today");
      expect(screen.getByRole("button", { name: "Monday, October 5, 2026" })).not.toHaveAttribute(
        "data-today"
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
