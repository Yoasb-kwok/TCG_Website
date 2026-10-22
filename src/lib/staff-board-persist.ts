/** Latest staff snapshot versus the one already confirmed stored. */
export function createStaffBoardPersist() {
  let stored = "";
  let latest = "";

  return {
    /** The board just loaded, or a write of this exact snapshot was confirmed. */
    saved(json: string) {
      stored = json;
      latest = json;
    },
    note(json: string) {
      latest = json;
    },
    dirty() {
      return latest !== stored;
    },
    /** Snapshot that still needs a write, or null when storage is current. */
    peek() {
      return latest === stored ? null : latest;
    },
    /** Ignore a confirmation that is older than a newer edit. */
    ack(json: string) {
      if (json === latest) stored = json;
    },
  };
}
