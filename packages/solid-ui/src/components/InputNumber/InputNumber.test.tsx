import { render, screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderInForm } from "../../../test/helpers";

import { formatNumber, InputNumber, parseNumber, roundNumber } from "./InputNumber";

describe("number helpers", () => {
  it("rounds half away from zero without float noise", () => {
    expect(roundNumber(1559.25 / 1.12, 3)).toBe(1392.188);
    expect(roundNumber(-2.5, 0)).toBe(-3);
  });

  it("formats and parses grouped numbers", () => {
    expect(formatNumber(1234.5, 2)).toBe("1,234.50");
    expect(formatNumber(null)).toBe("");
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("-")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });

  it("reads commas only as thousands separators", () => {
    expect(parseNumber("1,234,567.25")).toBe(1234567.25);
    expect(parseNumber("-12,000")).toBe(-12000);
    // A decimal comma, or a misplaced one, is invalid rather than silently dropped.
    expect(parseNumber("1,5")).toBeNull();
    expect(parseNumber("12,34")).toBeNull();
    expect(parseNumber("1234,567")).toBeNull();
    expect(parseNumber("1.234,56")).toBeNull();
  });
});

describe("InputNumber", () => {
  it("shows grouped digits but submits the plain number", () => {
    const { data } = renderInForm(() => (
      <InputNumber label="Amount" name="amount" defaultValue={1234.5} decimals={2} />
    ));
    expect(screen.getByLabelText("Amount")).toHaveValue("1,234.50");
    expect(data().get("amount")).toBe("1234.5");
  });

  it("parses, clamps and reports the value on blur", async () => {
    const onChange = vi.fn();
    const { data } = renderInForm(() => (
      <InputNumber label="Qty" name="qty" max={10} onChange={onChange} />
    ));
    const input = screen.getByLabelText("Qty");
    await userEvent.type(input, "25");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(10);
    expect(input).toHaveValue("10");
    expect(data().get("qty")).toBe("10");
  });

  it("restores defaultValue on form reset", async () => {
    const { data, reset } = renderInForm(() => (
      <InputNumber label="Qty" name="qty" defaultValue={3} />
    ));
    const input = screen.getByLabelText("Qty");
    await userEvent.clear(input);
    await userEvent.type(input, "8");
    await userEvent.tab();
    expect(data().get("qty")).toBe("8");
    await reset();
    expect(data().get("qty")).toBe("3");
    expect(input).toHaveValue("3");
  });

  it("restores defaultValue on a form reset while still being edited", async () => {
    const { data, reset } = renderInForm(() => (
      <InputNumber label="Qty" name="qty" defaultValue={3} />
    ));
    const input = screen.getByLabelText("Qty");
    await userEvent.clear(input);
    await userEvent.type(input, "8");
    expect(data().get("qty")).toBe("8");
    await reset();
    expect(input).toHaveFocus();
    expect(data().get("qty")).toBe("3");
    expect(input).toHaveValue("3");
    await userEvent.tab();
    expect(data().get("qty")).toBe("3");
  });

  it("never turns a decimal comma into a larger number", async () => {
    const onChange = vi.fn();
    const { data } = renderInForm(() => <InputNumber label="Qty" name="qty" onChange={onChange} />);
    const input = screen.getByLabelText("Qty");
    await userEvent.type(input, "1,5");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(null);
    expect(data().get("qty")).toBe("");
  });

  it("refuses a pasted number with a decimal comma", async () => {
    renderInForm(() => <InputNumber label="Qty" name="qty" />);
    const input = screen.getByLabelText("Qty");
    await userEvent.click(input);
    await userEvent.paste("1.234,56");
    expect(input).toHaveValue("");
    await userEvent.paste("1,234.5");
    expect(input).toHaveValue("1,234.5");
  });

  it("submits with a form it is outside of, through the form attribute", () => {
    render(() => (
      <>
        <form id="order" data-testid="form" />
        <InputNumber label="Qty" name="qty" form="order" defaultValue={4} />
      </>
    ));
    const form = screen.getByTestId("form") as HTMLFormElement;
    expect(new FormData(form).get("qty")).toBe("4");
  });

  it("submits an empty string when empty, like a native input", () => {
    const { data } = renderInForm(() => <InputNumber label="Qty" name="qty" />);
    expect(data().get("qty")).toBe("");
  });

  it("shows the currency symbol", () => {
    renderInForm(() => <InputNumber label="Price" currency="PHP" defaultValue={5} />);
    expect(screen.getByText("₱")).toBeInTheDocument();
    expect(screen.getByLabelText("Price")).toHaveValue("5.00");
  });

  it("submits the typed value when Enter submits the form before blur", async () => {
    const { data } = renderInForm(() => <InputNumber label="Qty" name="qty" defaultValue={1} />);
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.keyboard("{Control>}a{/Control}5");
    expect(data().get("qty")).toBe("5");
  });
});

describe("InputNumber limits", () => {
  it("never rounds past max or min", async () => {
    const onChange = vi.fn();
    const { data } = renderInForm(() => (
      <>
        <InputNumber label="High" name="high" decimals={2} max={1.005} onChange={onChange} />
        <InputNumber label="Low" name="low" decimals={2} min={-1.005} />
      </>
    ));
    await userEvent.type(screen.getByLabelText("High"), "1.01");
    await userEvent.type(screen.getByLabelText("Low"), "-1.01");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(1);
    expect(data().get("high")).toBe("1");
    expect(data().get("low")).toBe("-1");
    expect(screen.getByLabelText("High")).toHaveValue("1.00");
  });
});
