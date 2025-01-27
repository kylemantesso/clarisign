'use client';

import { AccessibilityProvider, useAccessibility } from './AccessibilityContext';

export default function AccessibilityLayout({
                                              children,
                                            }: {
  children: React.ReactNode;
}) {
  const { isDyslexicFont } = useAccessibility();

  console.log('isDyslexicFont', isDyslexicFont);

  return (
      <div className={isDyslexicFont ? 'font-dyslexic' : ''}>{children}</div>
  );
}