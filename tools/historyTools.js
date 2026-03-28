export function findPotentialDuplicateWork(message, siteId, workHistory) {
  const text = message.toLowerCase();

  return (
    workHistory.find((entry) => {
      const sameSite =
        String(entry.site_id || "").toLowerCase() === String(siteId || "").toLowerCase();

      const description = String(entry.description || "").toLowerCase();

      return (
        sameSite &&
        (
          (text.includes("pipe") && description.includes("pipe")) ||
          (text.includes("leak") && description.includes("leak")) ||
          (text.includes("light") && description.includes("light"))
        )
      );
    }) || null
  );
}