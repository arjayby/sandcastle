const productOrigin = (
  import.meta.env.PUBLIC_PRODUCT_URL ?? "http://localhost:5173"
).replace(/\/$/, "");

export const productLinks = {
  brandBrief: `${productOrigin}/new`,
  signIn: `${productOrigin}/dashboard?mode=sign-in`,
};
