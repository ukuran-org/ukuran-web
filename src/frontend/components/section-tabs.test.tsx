import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SectionTabs, { tabFromHash } from "./section-tabs";

function setHash(hash: string) {
  window.history.replaceState(null, "", hash || window.location.pathname);
}

function expectSelected(label: string) {
  expect(screen.getByRole("tab", { name: label })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tabpanel", { name: label })).toBeVisible();
}

describe("tabFromHash", () => {
  it("returns the tab named by the hash", () => {
    expect(tabFromHash("#about")).toBe("about");
    expect(tabFromHash("#ask")).toBe("ask");
  });

  it("falls back to Apps for a missing or unknown hash", () => {
    expect(tabFromHash("")).toBe("apps");
    expect(tabFromHash("#")).toBe("apps");
    expect(tabFromHash("#settings")).toBe("apps");
  });

  it("accepts an id without the leading hash", () => {
    expect(tabFromHash("ask")).toBe("ask");
  });

  it("matches the id exactly", () => {
    expect(tabFromHash("#About")).toBe("apps");
    expect(tabFromHash("#ASK")).toBe("apps");
    expect(tabFromHash("# about")).toBe("apps");
    expect(tabFromHash("#about ")).toBe("apps");
    expect(tabFromHash("#about/extra")).toBe("apps");
    expect(tabFromHash("#about?x=1")).toBe("apps");
    expect(tabFromHash("##about")).toBe("apps");
    expect(tabFromHash("#%61bout")).toBe("apps");
  });

  it("ignores ids that are not tabs but exist on the page or on objects", () => {
    expect(tabFromHash("#panel-about")).toBe("apps");
    expect(tabFromHash("#tab-ask")).toBe("apps");
    expect(tabFromHash("#constructor")).toBe("apps");
    expect(tabFromHash("#__proto__")).toBe("apps");
  });
});

describe("SectionTabs", () => {
  beforeEach(() => {
    setHash("");
  });

  it("renders the tabs in order with Apps selected by default", () => {
    render(<SectionTabs />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Apps", "About", "Ask"]);
    expectSelected("Apps");
    expect(screen.getByRole("tabpanel", { name: "Apps" })).toBeEmptyDOMElement();
  });

  it("links each tab to its panel", () => {
    render(<SectionTabs />);

    for (const tab of screen.getAllByRole("tab")) {
      const panelId = tab.getAttribute("aria-controls");
      const panel = document.getElementById(panelId ?? "");
      expect(panel).toHaveAttribute("role", "tabpanel");
      expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    }
  });

  it("switches tabs on click and updates the hash", async () => {
    const user = userEvent.setup();
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "About" }));

    expectSelected("About");
    expect(screen.getByRole("tabpanel", { name: "About" })).toHaveTextContent(
      "Description placeholder.",
    );
    expect(screen.queryByRole("tabpanel", { name: "Apps" })).toBeNull();
    expect(window.location.hash).toBe("#about");
  });

  it("selects the tab named by the hash on load", () => {
    setHash("#ask");
    render(<SectionTabs />);

    expectSelected("Ask");
  });

  it("hydrates server markup for Apps and then follows the hash", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<SectionTabs />);
    expect(
      container.querySelector('[role="tab"][aria-selected="true"]'),
    ).toHaveTextContent("Apps");
    document.body.appendChild(container);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    setHash("#about");
    render(<SectionTabs />, { container, hydrate: true });

    expectSelected("About");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("falls back to Apps when the hash is not a tab", () => {
    setHash("#unknown");
    render(<SectionTabs />);

    expectSelected("Apps");
  });

  it("follows hash changes made outside the tabs", () => {
    render(<SectionTabs />);

    act(() => {
      setHash("#about");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expectSelected("About");
  });

  it("uses a roving tab index", () => {
    render(<SectionTabs />);

    expect(screen.getByRole("tab", { name: "Apps" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: "About" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.getByRole("tab", { name: "Ask" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("moves and activates with the arrow keys and wraps around", async () => {
    const user = userEvent.setup();
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "Apps" }));

    await user.keyboard("{ArrowRight}");
    expectSelected("About");
    expect(screen.getByRole("tab", { name: "About" })).toHaveFocus();
    expect(window.location.hash).toBe("#about");

    await user.keyboard("{ArrowRight}");
    expectSelected("Ask");

    await user.keyboard("{ArrowRight}");
    expectSelected("Apps");
    expect(screen.getByRole("tab", { name: "Apps" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expectSelected("Ask");
    expect(screen.getByRole("tab", { name: "Ask" })).toHaveFocus();
  });

  it("jumps to the first and last tab with Home and End", async () => {
    const user = userEvent.setup();
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "Apps" }));

    await user.keyboard("{End}");
    expectSelected("Ask");
    expect(screen.getByRole("tab", { name: "Ask" })).toHaveFocus();

    await user.keyboard("{Home}");
    expectSelected("Apps");
    expect(screen.getByRole("tab", { name: "Apps" })).toHaveFocus();
  });

  it("ignores keys outside the tabs pattern", async () => {
    const user = userEvent.setup();
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "Apps" }));
    await user.keyboard("{ArrowDown}{ArrowUp}{PageDown}{Enter}{ }a");

    expectSelected("Apps");
    expect(screen.getByRole("tab", { name: "Apps" })).toHaveFocus();
    expect(window.location.hash).toBe("#apps");
  });

  it("does not switch tabs on arrow keys pressed inside a panel", async () => {
    const user = userEvent.setup();
    setHash("#about");
    render(<SectionTabs />);

    screen.getByRole("tabpanel", { name: "About" }).focus();
    await user.keyboard("{ArrowRight}{End}");

    expectSelected("About");
  });

  it("does not rewrite the URL when the selected tab is clicked again", async () => {
    const user = userEvent.setup();
    setHash("#about");
    render(<SectionTabs />);
    const replaceState = vi.spyOn(window.history, "replaceState");

    await user.click(screen.getByRole("tab", { name: "About" }));

    expect(replaceState).not.toHaveBeenCalled();
    expectSelected("About");
    replaceState.mockRestore();
  });

  it("keeps several instances in sync", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SectionTabs />
        <SectionTabs />
      </>,
    );

    await user.click(screen.getAllByRole("tab", { name: "Ask" })[0]);

    for (const tab of screen.getAllByRole("tab", { name: "Ask" })) {
      expect(tab).toHaveAttribute("aria-selected", "true");
    }
  });

  it("stops listening for hash changes after unmounting", () => {
    const removeListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<SectionTabs />);

    unmount();

    expect(removeListener).toHaveBeenCalledWith("hashchange", expect.any(Function));
    removeListener.mockRestore();
  });

  it("reaches the active tab with Tab and then the panel", async () => {
    const user = userEvent.setup();
    setHash("#about");
    render(<SectionTabs />);

    await user.tab();
    expect(screen.getByRole("tab", { name: "About" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("tabpanel", { name: "About" })).toHaveFocus();
  });
});
