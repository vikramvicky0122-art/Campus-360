const GRADIENT_CLASSES = new Set(["purple", "blue", "teal", "coral"]);

export const isExternalImage = (value) =>
  typeof value === "string" && /^https?:\/\//i.test(value);

export const resolveMediaDisplay = (value, fallback = "purple") => {
  if (isExternalImage(value)) {
    return {
      className: "marketplace-card-media",
      style: {
        backgroundImage: `url(${value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }
    };
  }

  const mediaClass =
    typeof value === "string" && GRADIENT_CLASSES.has(value) ? value : fallback;

  return {
    className: `marketplace-card-media ${mediaClass}`,
    style: {}
  };
};
