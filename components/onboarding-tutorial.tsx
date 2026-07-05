"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Slide {
  emoji: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    emoji: "🍌",
    title: "Willkommen im Banana Shop!",
    body: "Deine private Wett-Plattform für den Freundeskreis. Tippe auf Ereignisse, sammle Bananas und kämpf dich aufs Leaderboard. Hier die wichtigsten Dinge in 30 Sekunden.",
  },
  {
    emoji: "💛",
    title: "Bananas sind die Währung",
    body: "1 Banane = 1 €. Bananas bekommst du im Shop auf deiner Profilseite — du fragst an, der Admin lädt dich nach der Zahlung auf. Auszahlen läuft genauso: anfragen, der Admin zahlt dir persönlich aus.",
  },
  {
    emoji: "📈",
    title: "Wetten & Quoten",
    body: "Auf jeden Markt kannst du Bananas setzen. Die Quote hängt davon ab, wie die anderen wetten, und wird beim Setzen für dich fixiert. Pro Tag kannst du maximal 5 Bananas verwetten — bleibt fair und klein.",
  },
  {
    emoji: "🎯",
    title: "Gratis-Tippspiel",
    body: "Kein Geld übrig? Kein Problem. Gib auf jedem Markt einen kostenlosen Tipp ab und sammle Punkte. Außenseiter bringen mehr Punkte. Das eigene Punkte-Ranking startet jeden Monat neu.",
  },
  {
    emoji: "🏆",
    title: "Leaderboard & eigene Wetten",
    body: "Im Leaderboard siehst du, wer vorne liegt — bei Bananas und beim Tippspiel. Und du kannst selbst Wetten vorschlagen: über „Propose“. Der Admin gibt sie frei, dann kann jeder mitwetten. Los geht's!",
  },
];

export default function OnboardingTutorial() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || checked) return;
    setChecked(true);
    fetch("/api/profile/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.hasOnboarded === false) setOpen(true);
      })
      .catch(() => {});
  }, [status, checked]);

  function finish() {
    setOpen(false);
    fetch("/api/profile/onboarding", { method: "POST" }).catch(() => {});
  }

  if (!session || !open) return null;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Skip */}
        <button
          onClick={finish}
          className="absolute top-3 right-4 text-xs text-gray-500 hover:text-gray-300 transition-colors z-10"
        >
          Überspringen
        </button>

        {/* Content */}
        <div className="px-8 pt-12 pb-6 text-center">
          <div className="text-6xl mb-5">{slide.emoji}</div>
          <h2 className="text-xl font-bold text-white mb-3">{slide.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed min-h-[88px]">
            {slide.body}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-yellow-400" : "w-1.5 bg-gray-700 hover:bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-800/50 border-t border-gray-800">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-0 disabled:pointer-events-none transition-colors"
          >
            Zurück
          </button>

          {isLast ? (
            <button
              onClick={finish}
              className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold rounded-xl transition-colors"
            >
              Los geht's! 🍌
            </button>
          ) : (
            <button
              onClick={() => setIndex((i) => Math.min(SLIDES.length - 1, i + 1))}
              className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold rounded-xl transition-colors"
            >
              Weiter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
