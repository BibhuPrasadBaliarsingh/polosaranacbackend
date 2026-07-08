const extractWardNumber = (value = "") => {
  const text = String(value).trim();
  if (!text) return "";

  const match = text.match(/ward\s*[-:]?\s*(\d+)/i);
  return match ? `Ward ${match[1]}` : "";
};

export const normalizeWardName = (value = "") => {
  const extracted = extractWardNumber(value);
  if (extracted) return extracted;

  const text = String(value).trim();
  if (!text) return "";

  return text
    .replace(/\s+/g, " ")
    .replace(/^ward\s*/i, "Ward ")
    .trim();
};

export const getTrackingWardName = (trackingItem = {}) => {
  return normalizeWardName(
    trackingItem.address ||
      trackingItem.ward ||
      trackingItem.assignedWard ||
      trackingItem.route_name ||
      "",
  );
};
