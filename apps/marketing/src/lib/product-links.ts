const productOrigin = (
  import.meta.env.PUBLIC_PRODUCT_URL ?? "http://localhost:5173"
).replace(/\/$/, "");

export const productLinks = {
  home: `${productOrigin}/`,
  signIn: `${productOrigin}/dashboard?mode=sign-in`,
};
