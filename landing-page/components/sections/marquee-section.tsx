'use client';

export function MarqueeSection() {
  const points = [
    'Everything in your phone',
    'For coaches managing 10 - 100+ clients',
    'No more UPI screenshots',
    'No more multiple XLS sheets',
    'No more unplanned video calls'
  ];

  return (
    <section className="border-y border-white/10 bg-[#0b1117] py-2 sm:py-3 lg:py-4" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
      <div className="overflow-hidden whitespace-nowrap">
        <div className="marquee-track inline-flex items-center gap-5 pr-5 text-[9px] font-medium uppercase tracking-[0.25em] text-muted sm:text-[10px] lg:text-xs">
          {points.concat(points).map((point, index) => (
            <span key={`${point}-${index}`} className="flex items-center gap-5 opacity-90">
              <span>{point}</span>
              {index < points.concat(points).length - 1 ? <span className="text-accent/70">•</span> : null}
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .marquee-track {
          animation: marquee 24s linear infinite;
          will-change: transform;
        }
      `}</style>
    </section>
  );
}
