import { screen } from "@testing-library/react";
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

  it("keeps years before 1000, which Date reads as 19xx or writes without padding", () => {
    expect(parseISODate("0099-03-09")!.getFullYear()).toBe(99);
    expect(toISODate(parseISODate("0999-03-09")!)).toBe("0999-03-09");
    expect(addMonths("0099-12-15", 1)).toBe("0100-01-15");
    expect(calendarDays("0050-03-15")).toContain("0050-03-01");
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
    const { data } = renderInForm(
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" />
    );
    expect(screen.getByLabelText("Due date")).toHaveValue("Oct 5, 2026");
    expect(data().get("due")).toBe("2026-10-05");
  });

  it("opens from a click on its label, and closes from a click on the field", async () => {
    renderInForm(<DatePicker label="Due date" />);
    const field = screen.getByRole("combobox", { name: "Due date" });
    await userEvent.click(screen.getByText("Due date"));
    expect(field).toHaveAttribute("aria-expanded", "true");
    expect(field).toHaveFocus();
    await userEvent.click(field);
    expect(field).toHaveAttribute("aria-expanded", "false");
  });

  it("picks a day from the calendar", async () => {
    const onChange = vi.fn();
    const { data } = renderInForm(
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" onChange={onChange} />
    );
    await openCalendar();
    await userEvent.click(await screen.findByRole("button", { name: "Tuesday, October 20, 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-10-20");
    expect(data().get("due")).toBe("2026-10-20");
    expect(screen.getByLabelText("Due date")).toHaveValue("Oct 20, 2026");
  });

  it("navigates with the keyboard", async () => {
    const { data } = renderInForm(
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" />
    );
    screen.getByLabelText("Due date").focus();
    await userEvent.keyboard("{Enter}{ArrowRight}{ArrowDown}{Enter}");
    expect(data().get("due")).toBe("2026-10-13");
  });

  it("drills from years to months to days", async () => {
    const { data } = renderInForm(
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" />
    );
    await openCalendar();
    await userEvent.click(await screen.findByRole("button", { name: "October 2026" }));
    await userEvent.click(screen.getByRole("button", { name: "2026" }));
    await userEvent.click(screen.getByRole("button", { name: "2024" }));
    await userEvent.click(screen.getByRole("button", { name: "March 2024" }));
    await userEvent.click(screen.getByRole("button", { name: "Friday, March 15, 2024" }));
    expect(data().get("due")).toBe("2024-03-15");
  });

  it("disables days outside min and max", async () => {
    renderInForm(
      <DatePicker label="Due date" defaultValue="2026-10-10" min="2026-10-05" max="2026-10-20" />
    );
    await openCalendar();
    expect(await screen.findByRole("button", { name: "Sunday, October 4, 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Monday, October 5, 2026" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Wednesday, October 21, 2026" })).toBeDisabled();
  });

  it("clears with Backspace only when clearable", async () => {
    const { data } = renderInForm(
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" />
    );
    screen.getByLabelText("Due date").focus();
    await userEvent.keyboard("{Backspace}");
    expect(data().get("due")).toBe("2026-10-05");
  });

  it("restores defaultValue on form reset and clears with Backspace", async () => {
    const { data, reset } = renderInForm(
      <DatePicker label="Due date" name="due" defaultValue="2026-10-05" clearable />
    );
    screen.getByLabelText("Due date").focus();
    await userEvent.keyboard("{Backspace}");
    expect(data().get("due")).toBe("");
    await reset();
    expect(data().get("due")).toBe("2026-10-05");
    expect(screen.getByLabelText("Due date")).toHaveValue("Oct 5, 2026");
  });

  it("blocks the form when required and empty", () => {
    const { form } = renderInForm(<DatePicker label="Due date" name="due" required />);
    expect(form.checkValidity()).toBe(false);
  });

  it("can't be typed in", async () => {
    renderInForm(<DatePicker label="Due date" />);
    await userEvent.type(screen.getByLabelText("Due date"), "hello");
    expect(screen.getByLabelText("Due date")).toHaveValue("");
  });
});

describe("DatePicker robustness", () => {
  const monthYear = (date: Date) =>
    new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);

  it.each(["2024-02-05T00:00:00Z", "2024-02-30", "2024-2-5", "soon"])(
    "opens on today for a value that isn't a YYYY-MM-DD date: %s",
    async value => {
      renderInForm(<DatePicker label="Due date" defaultValue={value} />);
      await openCalendar();
      expect(await screen.findByRole("dialog", { name: "Choose a date" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: monthYear(new Date()) })).toBeInTheDocument();
    }
  );

  it("pages a year with Shift+PageUp and Shift+PageDown", async () => {
    renderInForm(<DatePicker label="Due date" defaultValue="2026-03-15" />);
    screen.getByLabelText("Due date").focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("button", { name: "March 2026" })).toBeInTheDocument();
    await userEvent.keyboard("{Shift>}{PageUp}{/Shift}");
    expect(screen.getByRole("button", { name: "March 2025" })).toBeInTheDocument();
    await userEvent.keyboard("{PageDown}");
    expect(screen.getByRole("button", { name: "April 2025" })).toBeInTheDocument();
    await userEvent.keyboard("{Shift>}{PageDown}{/Shift}");
    expect(screen.getByRole("button", { name: "April 2026" })).toBeInTheDocument();
  });

  it("stops paging at year 0, which is as far back as YYYY-MM-DD goes", async () => {
    renderInForm(<DatePicker label="Due date" defaultValue="0003-03-15" />);
    screen.getByLabelText("Due date").focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Shift>}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{/Shift}");
    expect(screen.getByRole("dialog", { name: "Choose a date" })).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByLabelText("Due date")).toHaveValue(
      new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(new Date(2000, 2, 15).setFullYear(0))
      )
    );
  });

  it("doesn't rebuild its formatters for an inline format of the same content", () => {
    const spy = vi.spyOn(Intl, "DateTimeFormat");
    const { rerenderInForm } = renderInForm(
      <DatePicker label="Due date" defaultValue="2026-03-15" format={{ dateStyle: "medium" }} />
    );
    const created = spy.mock.calls.length;
    rerenderInForm(
      <DatePicker label="Due date" defaultValue="2026-03-15" format={{ dateStyle: "medium" }} />
    );
    expect(spy.mock.calls.length).toBe(created);
    expect(screen.getByLabelText("Due date")).toHaveValue("Mar 15, 2026");
    spy.mockRestore();
  });
});
