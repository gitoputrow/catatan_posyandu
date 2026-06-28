import type { Child } from "@/components/children/types";
import { childrenData } from "@/lib/data/children";

const storageKey = "catatan-posyandu-children";
let cachedChildren: Child[] | null = null;

export function getStoredChildren() {
  if (cachedChildren) return cachedChildren;

  const storedValue = window.localStorage.getItem(storageKey);
  if (!storedValue) {
    cachedChildren = childrenData;
    return cachedChildren;
  }

  try {
    cachedChildren = JSON.parse(storedValue) as Child[];
    return cachedChildren;
  } catch {
    cachedChildren = childrenData;
    return cachedChildren;
  }
}

export function saveStoredChildren(children: Child[]) {
  cachedChildren = children;
  window.localStorage.setItem(storageKey, JSON.stringify(children));
}
