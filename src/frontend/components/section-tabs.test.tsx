import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SectionTabs, {
  nextTab,
  previousTab,
  slotOf,
  tabFromHash,
} from "./section-tabs";

function setHash(hash: string) {
  window.history.replaceState(null, "", hash || window.location.pathname);
}

// Labels in visual order from left to right, read from each tab's carousel slot.
function visualOrder() {
  return screen
    .getAllByRole("tab")
    .sort((a, b) => Number(a.dataset.slot) - Number(b.dataset.slot))
    .map((tab) => tab.textContent);
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query === "(prefers-reduced-motion: reduce)",
      media: query,
    })),
  );
}

// jsdom has no Web Animations API, so record the slides instead.
function stubAnimate() {
  const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
  HTMLElement.prototype.animate = animate;
  return animate;
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

describe("carousel order", () => {
  it("cycles Apps, About, Ask in both directions", () => {
    expect(nextTab("apps")).toBe("about");
    expect(nextTab("about")).toBe("ask");
    expect(nextTab("ask")).toBe("apps");
    expect(previousTab("apps")).toBe("ask");
    expect(previousTab("about")).toBe("apps");
    expect(previousTab("ask")).toBe("about");
  });

  it("puts the selected tab in the centre, the previous on the left and the next on the right", () => {
    expect(slotOf("apps", "apps")).toBe(0);
    expect(slotOf("ask", "apps")).toBe(-1);
    expect(slotOf("about", "apps")).toBe(1);
    expect(slotOf("apps", "about")).toBe(-1);
    expect(slotOf("ask", "about")).toBe(1);
  });
});

describe("SectionTabs", () => {
  beforeEach(() => {
    setHash("");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error jsdom has no animate, so the stub is removed again
    delete HTMLElement.prototype.animate;
  });

  it("shows Ask, Apps and About from left to right by default", () => {
    render(<SectionTabs />);

    expect(visualOrder()).toEqual(["Ask", "Apps", "About"]);
  });

  it("rotates the left tab into the centre when it is clicked", async () => {
    const user = userEvent.setup();
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "Ask" }));

    expectSelected("Ask");
    expect(visualOrder()).toEqual(["About", "Ask", "Apps"]);
    expect(window.location.hash).toBe("#ask");
  });

  it("rotates the right tab into the centre when it is clicked", async () => {
    const user = userEvent.setup();
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "About" }));

    expectSelected("About");
    expect(visualOrder()).toEqual(["Apps", "About", "Ask"]);
  });

  it("does nothing when the centre tab is clicked", async () => {
    const user = userEvent.setup();
    const animate = stubAnimate();
    stubReducedMotion(false);
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "Apps" }));

    expectSelected("Apps");
    expect(visualOrder()).toEqual(["Ask", "Apps", "About"]);
    expect(animate).not.toHaveBeenCalled();
  });

  it("keeps the DOM order fixed while the carousel rotates", async () => {
    const user = userEvent.setup();
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "Ask" }));
    await user.click(screen.getByRole("tab", { name: "About" }));

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Apps",
      "About",
      "Ask",
    ]);
  });

  it("rotates with the arrow keys in the direction pressed", async () => {
    const user = userEvent.setup();
    render(<SectionTabs />);
    screen.getByRole("tab", { name: "Apps" }).focus();

    await user.keyboard("{ArrowLeft}");
    expect(visualOrder()).toEqual(["About", "Ask", "Apps"]);
    expect(screen.getByRole("tab", { name: "Ask" })).toHaveFocus();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(visualOrder()).toEqual(["Apps", "About", "Ask"]);
    expect(screen.getByRole("tab", { name: "About" })).toHaveFocus();
  });

  it("centres Apps on Home and Ask on End", async () => {
    const user = userEvent.setup();
    setHash("#about");
    render(<SectionTabs />);
    screen.getByRole("tab", { name: "About" }).focus();

    await user.keyboard("{End}");
    expect(visualOrder()).toEqual(["About", "Ask", "Apps"]);

    await user.keyboard("{Home}");
    expect(visualOrder()).toEqual(["Ask", "Apps", "About"]);
  });

  it("opens a deep link with that tab centred", () => {
    setHash("#about");
    render(<SectionTabs />);

    expect(visualOrder()).toEqual(["Apps", "About", "Ask"]);
  });

  it("slides every tab when a rotation is made with the carousel", async () => {
    const user = userEvent.setup();
    const animate = stubAnimate();
    stubReducedMotion(false);
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "Ask" }));

    expect(animate).toHaveBeenCalledTimes(3);
    const calls = animate.mock.calls as unknown as [Keyframe[], KeyframeAnimationOptions][];
    for (const [, options] of calls) {
      expect(options.duration).toBe(300);
    }
    // About leaves on the right and pops in on the left, so only it fades.
    const fading = calls.filter(([keyframes]) => keyframes.some((frame) => frame.opacity === 0));
    expect(fading).toHaveLength(1);
    expect(animate.mock.contexts[calls.indexOf(fading[0])]).toBe(
      screen.getByRole("tab", { name: "About" }),
    );
  });

  it("switches instantly when reduced motion is preferred", async () => {
    const user = userEvent.setup();
    const animate = stubAnimate();
    stubReducedMotion(true);
    render(<SectionTabs />);

    await user.click(screen.getByRole("tab", { name: "Ask" }));

    expectSelected("Ask");
    expect(animate).not.toHaveBeenCalled();
  });

  it("does not slide when the hash changes outside the carousel", () => {
    const animate = stubAnimate();
    stubReducedMotion(false);
    render(<SectionTabs />);

    act(() => {
      setHash("#ask");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expectSelected("Ask");
    expect(animate).not.toHaveBeenCalled();
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
    // Clicking the centre tab leaves the URL alone.
    expect(window.location.hash).toBe("");
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
