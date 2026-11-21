"use client";

import {
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";

export const tabs = [
  { id: "apps", label: "Apps" },
  { id: "about", label: "About" },
  { id: "ask", label: "Ask" },
] as const;

export type TabId = (typeof tabs)[number]["id"];

export const defaultTab: TabId = "apps";

export function tabFromHash(hash: string): TabId {
  const id = hash.replace(/^#/, "");
  return tabs.find((tab) => tab.id === id)?.id ?? defaultTab;
}

function indexOf(id: TabId) {
  return tabs.findIndex((tab) => tab.id === id);
}

/** The tab before `id` in the circular order Apps, About, Ask. */
export function previousTab(id: TabId): TabId {
  return tabs[(indexOf(id) - 1 + tabs.length) % tabs.length].id;
}

/** The tab after `id` in the circular order Apps, About, Ask. */
export function nextTab(id: TabId): TabId {
  return tabs[(indexOf(id) + 1) % tabs.length].id;
}

export type Slot = -1 | 0 | 1;

/**
 * Where a tab sits in the carousel: the selected tab in the centre (0), the
 * previous tab on the left (-1) and the next tab on the right (1).
 */
export function slotOf(id: TabId, selected: TabId): Slot {
  if (id === selected) {
    return 0;
  }
  return id === nextTab(selected) ? 1 : -1;
}

// `history.replaceState` does not fire `hashchange`, so tab changes made here
// notify subscribers directly.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("hashchange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("hashchange", listener);
  };
}

function getSnapshot(): TabId {
  return tabFromHash(window.location.hash);
}

// The server cannot see the hash, so it always renders the default tab and the
// client switches to the tab in the URL right after hydration.
function getServerSnapshot(): TabId {
  return defaultTab;
}

function selectTab(id: TabId) {
  if (window.location.hash !== `#${id}`) {
    window.history.replaceState(window.history.state, "", `#${id}`);
  }
  listeners.forEach((listener) => listener());
}

const slideDuration = 300;
const sideScale = 0.8;

// Fractional slots are used while a tab wraps around from one side to the other.
function slotTransform(slot: number) {
  const scale = slot === 0 ? 1 : sideScale;
  return `translateX(calc(-50% + ${slot} * var(--tab-spacing))) scale(${scale})`;
}

function slideKeyframes(from: Slot, to: Slot): Keyframe[] {
  if (Math.abs(to - from) < 2) {
    return [{ transform: slotTransform(from) }, { transform: slotTransform(to) }];
  }
  // The tab leaving one side slides out further and pops in on the other side.
  const direction = Math.sign(from);
  return [
    { transform: slotTransform(from), opacity: 1 },
    { transform: slotTransform(from + direction * 0.5), opacity: 0, offset: 0.45 },
    { transform: slotTransform(to - direction * 0.5), opacity: 0, offset: 0.55 },
    { transform: slotTransform(to), opacity: 1 },
  ];
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/*
 * The tabs stay in the DOM in their fixed order Apps, About, Ask, so screen
 * readers always announce the same positions ("1 of 3" is always Apps) and the
 * order never changes under the user. The carousel only moves them visually
 * with transforms. Keyboard users are not affected by the difference because
 * the roving tab index leaves only the selected tab in the tab order, and the
 * arrow keys follow the visual direction: Left selects the tab on the left
 * and Right the tab on the right.
 */
export default function SectionTabs() {
  const activeTab = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const tabRefs = useRef(new Map<TabId, HTMLButtonElement>());
  const shownTab = useRef(activeTab);
  const slideOnNextChange = useRef(false);
  const slides = useRef(new Map<TabId, Animation>());

  // Only changes made with this carousel slide. Deep links, history
  // navigation and other instances switch instantly.
  useLayoutEffect(() => {
    const previous = shownTab.current;
    shownTab.current = activeTab;
    const shouldSlide = slideOnNextChange.current;
    slideOnNextChange.current = false;
    if (!shouldSlide || previous === activeTab || prefersReducedMotion()) {
      return;
    }

    for (const tab of tabs) {
      const element = tabRefs.current.get(tab.id);
      if (!element || typeof element.animate !== "function") {
        continue;
      }
      slides.current.get(tab.id)?.cancel();
      const from = slotOf(tab.id, previous);
      const to = slotOf(tab.id, activeTab);
      if (from !== to) {
        slides.current.set(
          tab.id,
          element.animate(slideKeyframes(from, to), {
            duration: slideDuration,
            easing: "ease-in-out",
          }),
        );
      }
    }
  }, [activeTab]);

  // Choosing the tab that is already in the centre does nothing.
  function rotateTo(id: TabId, moveFocus: boolean) {
    if (id !== activeTab) {
      slideOnNextChange.current = true;
      selectTab(id);
    }
    if (moveFocus) {
      tabRefs.current.get(id)?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let target: TabId;

    switch (event.key) {
      case "ArrowRight":
        target = nextTab(activeTab);
        break;
      case "ArrowLeft":
        target = previousTab(activeTab);
        break;
      case "Home":
        target = tabs[0].id;
        break;
      case "End":
        target = tabs[tabs.length - 1].id;
        break;
      default:
        return;
    }

    event.preventDefault();
    rotateTo(target, true);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6">
      <div
        role="tablist"
        aria-label="Sections"
        className="relative h-[3.75rem] overflow-x-clip border-b border-neutral-200 [--tab-spacing:clamp(6.25rem,28vw,10.5rem)] sm:h-[4.25rem]"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isSelected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                if (element) {
                  tabRefs.current.set(tab.id, element);
                } else {
                  tabRefs.current.delete(tab.id);
                }
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              data-slot={slotOf(tab.id, activeTab)}
              style={{ transform: slotTransform(slotOf(tab.id, activeTab)) }}
              onClick={() => rotateTo(tab.id, false)}
              className="absolute -bottom-px left-1/2 origin-bottom cursor-pointer whitespace-nowrap border-b-2 border-transparent px-5 py-4 text-xl leading-7 font-medium text-neutral-500 transition-colors duration-300 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black motion-reduce:transition-none sm:px-6 sm:py-[1.125rem] sm:text-2xl sm:leading-8 aria-selected:border-black aria-selected:text-black"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          tabIndex={0}
          hidden={tab.id !== activeTab}
          className="py-8 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {tab.id === "about" ? <p>Description placeholder.</p> : null}
        </div>
      ))}
    </div>
  );
}
