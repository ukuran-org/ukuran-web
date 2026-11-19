"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";

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

export default function SectionTabs() {
  const activeTab = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const tabRefs = useRef(new Map<TabId, HTMLButtonElement>());

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex: number;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex].id;
    selectTab(nextTab);
    tabRefs.current.get(nextTab)?.focus();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6">
      <div
        role="tablist"
        aria-label="Sections"
        className="flex justify-center gap-2 border-b sm:gap-3 border-neutral-200"
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
              onClick={() => selectTab(tab.id)}
              className="-mb-px cursor-pointer border-b-2 border-transparent px-5 py-4 text-xl font-medium sm:px-6 sm:py-[1.125rem] sm:text-2xl text-neutral-500 transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black aria-selected:border-black aria-selected:text-black"
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
