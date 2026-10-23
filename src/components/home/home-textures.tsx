/** Paper grain and gold cloud, matching the Figma page field (multiply, low opacity). */
export function HomeTextures() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 opacity-[0.28] mix-blend-multiply">
        <div
          className="absolute inset-0 opacity-[0.24]"
          style={{
            backgroundImage: "url(/brand/home/paper-texture.png)",
            backgroundSize: "42px 42px",
          }}
        />
      </div>
      <div className="absolute inset-0 opacity-[0.13] mix-blend-multiply">
        <div
          className="absolute inset-0 opacity-[0.34]"
          style={{
            backgroundImage: "url(/brand/home/gold-cloud.png)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>
    </div>
  );
}
