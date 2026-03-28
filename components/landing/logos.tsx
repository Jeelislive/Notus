const logos = [
  'Airbnb', 'Figma', 'CloudFlare', 'Discord', 'Dropbox',
  'GoogleAnalytics', 'Dribbble', 'GitHub', 'Postman', 'Reddit',
  'Microsoft', 'GoogleAds', 'GoDaddy', 'Google', 'GitLab',
  'Pinterest', 'Framer', 'Vercel', 'Spotify', 'Spline',
]

export function Logos() {
  return (
    <section className="flex flex-col items-center justify-center py-16 px-5 border-t border-border">
      <p className="text-xs text-muted-foreground/50 uppercase tracking-[0.15em] font-medium text-center mb-10">
        Trusted by teams at world&apos;s leading companies
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl">
        {logos.map((name) => (
          <div
            key={name}
            className="grid place-content-center aspect-square size-14 bg-muted/40 border border-border rounded-xl
              hover:bg-muted/70 transition-colors duration-200"
          >
            <img
              src={`https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/companyLogo/mark/${name}.svg`}
              alt={name}
              className="size-7 object-contain dark:invert"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
