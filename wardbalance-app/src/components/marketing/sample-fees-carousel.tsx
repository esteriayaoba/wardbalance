"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FeeSample {
  name: string;
  amount: number;
  frequency: string;
  type: "mandatory" | "optional";
  description: string;
}

const sampleFees: FeeSample[] = [
  {
    name: "Tuition Fee (Primary)",
    amount: 120000,
    frequency: "Per Term",
    type: "mandatory",
    description: "Core educational tuition fee applied to Primary 1 - Primary 6 class levels.",
  },
  {
    name: "Tuition Fee (Secondary)",
    amount: 180000,
    frequency: "Per Term",
    type: "mandatory",
    description: "Core educational tuition fee applied to JSS1 - SSS3 class levels.",
  },
  {
    name: "PTA Levy",
    amount: 10000,
    frequency: "Per Term",
    type: "mandatory",
    description: "Parent-Teacher Association development levy charged per family.",
  },
  {
    name: "School Bus Service",
    amount: 35000,
    frequency: "Per Term",
    type: "optional",
    description: "Optional transportation service charge for round-trip daily transit.",
  },
  {
    name: "Textbooks & Stationery",
    amount: 45000,
    frequency: "Per Session",
    type: "mandatory",
    description: "Full set of curriculum textbooks, notebooks, and learning accessories.",
  },
  {
    name: "School Uniforms (Set)",
    amount: 25000,
    frequency: "One-Off",
    type: "mandatory",
    description: "Official school uniform set, house sportswear, and accessories.",
  },
  {
    name: "STEM & Robotics Club",
    amount: 15000,
    frequency: "Per Term",
    type: "optional",
    description: "Optional weekend extra-curricular coding and robotics curriculum.",
  },
  {
    name: "Graduation Levy",
    amount: 30000,
    frequency: "One-Off",
    type: "mandatory",
    description: "One-off administrative and ceremony charge for final term students.",
  },
];

const CARDS_VISIBLE = 3; // number of cards visible at once on desktop

export default function SampleFeesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const maxIndex = sampleFees.length - CARDS_VISIBLE;

  const formatNaira = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG")}`;
  };

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, maxIndex));
    setCurrentIndex(clamped);
  }, [maxIndex]);

  const prev = () => goTo(currentIndex - 1);
  const next = () => goTo(currentIndex + 1);

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < maxIndex;

  return (
    <section
      id="fees"
      aria-labelledby="fees-heading"
      className="py-24 md:py-32 lg:py-36 bg-neutral-50/40 border-t border-b border-neutral-200/60 scroll-mt-[var(--marketing-header-offset)] relative overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header + Navigation */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <div className="max-w-2xl">
            <p className="text-label-large mb-3 text-primary uppercase font-bold tracking-wider">
              Fee Catalog
            </p>
            <h2 id="fees-heading" className="text-headline-medium md:text-display-small font-bold text-neutral-900 leading-tight">
              Flexibility to model every fee item.
            </h2>
            <p className="text-body-large text-neutral-600 mt-4 leading-relaxed">
              Configure mandatory tuition, termly levies, optional clubs, or one-off items. WardBalance handles any Nigerian school fee structure cleanly.
            </p>
          </div>

          {/* Arrow Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-label-small text-neutral-500 tabular-nums mr-1">
              {currentIndex + 1} – {Math.min(currentIndex + CARDS_VISIBLE, sampleFees.length)} of {sampleFees.length}
            </span>
            <button
              onClick={prev}
              disabled={!canPrev}
              aria-label="Previous fee items"
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 ${
                canPrev
                  ? "border-neutral-300 text-neutral-700 hover:border-primary hover:text-primary hover:shadow-sm bg-white"
                  : "border-neutral-200 text-neutral-300 cursor-not-allowed bg-neutral-50"
              }`}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              disabled={!canNext}
              aria-label="Next fee items"
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 ${
                canNext
                  ? "border-neutral-300 text-neutral-700 hover:border-primary hover:text-primary hover:shadow-sm bg-white"
                  : "border-neutral-200 text-neutral-300 cursor-not-allowed bg-neutral-50"
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Carousel Track */}
        <div className="overflow-hidden" role="region" aria-label="Fee items carousel">
          <div
            ref={trackRef}
            className="flex gap-6 transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(calc(-${currentIndex} * (100% / ${CARDS_VISIBLE} + 8px)))` }}
          >
            {sampleFees.map((fee, idx) => (
              <div
                key={idx}
                className="border border-neutral-200/60 bg-white rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary-200/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between shrink-0"
                style={{ width: `calc(${100 / CARDS_VISIBLE}% - ${((CARDS_VISIBLE - 1) * 24) / CARDS_VISIBLE}px)` }}
              >
                <div>
                  {/* Header Row: Type Badge & Frequency */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                        fee.type === "mandatory"
                          ? "bg-primary-50 border-primary-100 text-primary-600"
                          : "bg-neutral-50 border-neutral-300 text-neutral-600"
                      }`}
                    >
                      {fee.type}
                    </span>
                    <span className="text-body-small font-bold text-neutral-600 uppercase tracking-wider">
                      {fee.frequency}
                    </span>
                  </div>

                  {/* Fee Name */}
                  <h3 className="text-title-medium text-neutral-900 font-extrabold mb-2.5">
                    {fee.name}
                  </h3>

                  {/* Description */}
                  <p className="text-body-medium text-neutral-600 leading-relaxed mb-6">
                    {fee.description}
                  </p>
                </div>

                {/* Price Row */}
                <div className="border-t border-neutral-100 pt-4 mt-2 flex items-baseline justify-between">
                  <span className="text-body-small font-bold text-neutral-600 uppercase tracking-wider">
                    Amount
                  </span>
                  <span className="text-headline-small font-black text-neutral-900 font-sans tabular-nums">
                    {formatNaira(fee.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-2 mt-8" aria-hidden="true">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to fee item ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-6 h-2 bg-primary"
                  : "w-2 h-2 bg-neutral-300 hover:bg-neutral-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
