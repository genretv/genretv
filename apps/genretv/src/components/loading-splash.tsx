export function LoadingSplash() {
  return (
    <picture className="loading-splash">
      <source srcSet="/assets/splash_0q60.avif" type="image/avif" />
      <source srcSet="/assets/splash_0q90.webp" type="image/webp" />
      <img src="/assets/splash.png" alt="GenreTV" width={1672} height={941} loading="eager" decoding="async" />
    </picture>
  );
}
