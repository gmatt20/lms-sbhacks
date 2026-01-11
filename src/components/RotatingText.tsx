'use client';

import { useState, useEffect } from 'react';

const phrases = [
  'teach with confidence',
  'grade with trust',
  'verify authentic learning',
  'protect academic integrity',
  'ensure student authorship',
];

export function RotatingText() {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setIndex((current) => (current + 1) % phrases.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={`inline-block transition-all duration-300 ${isAnimating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        }`}
    >
      {phrases[index]}
    </span>
  );
}
