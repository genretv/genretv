const requestMarker = "genretv.storage.persist-requested.v1";

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (localStorage.getItem(requestMarker) != null) return null;
  if (navigator.storage?.persist == null) return null;
  localStorage.setItem(requestMarker, new Date().toISOString());
  return navigator.storage.persist();
}
