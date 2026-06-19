import React from 'react';

interface VirtualKeyboardProps {
  nextChar: string;
  isCapsLockOn?: boolean;
}

const getFingerInfo = (key: string): { name: string; colorClass: string; isLeft: boolean } => {
  const k = key.toLowerCase();

  // Left Pinky
  if (['1', 'q', 'a', 'z', 'shift-l', 'caps'].includes(k)) {
    return { name: 'Far yareeyda ee gacanta Bidix (Left Pinky)', colorClass: 'border-rose-500 text-rose-500 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10', isLeft: true };
  }
  // Left Ring
  if (['2', 'w', 's', 'x'].includes(k)) {
    return { name: 'Farta faraantiga ee gacanta Bidix (Left Ring)', colorClass: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10', isLeft: true };
  }
  // Left Middle
  if (['3', 'e', 'd', 'c'].includes(k)) {
    return { name: 'Farta dhexe ee gacanta Bidix (Left Middle)', colorClass: 'border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5 dark:bg-yellow-500/10', isLeft: true };
  }
  // Left Index
  if (['4', '5', 'r', 't', 'f', 'g', 'v', 'b'].includes(k)) {
    return { name: 'farta Murugsato ee gacanta Bidix (Left Index)', colorClass: 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10', isLeft: true };
  }
  // Thumbs
  if (k === 'space') {
    return { name: 'Suulka (Thumb - Midig ama Bidix)', colorClass: 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10', isLeft: false };
  }
  // Right Index
  if (['6', '7', 'y', 'u', 'h', 'j', 'n', 'm'].includes(k)) {
    return { name: 'farta Murugsato ee gacanta Midig (Right Index)', colorClass: 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10', isLeft: false };
  }
  // Right Middle
  if (['8', 'i', 'k', ','].includes(k)) {
    return { name: 'farta dhexe ee gacanta Midig (Right Middle)', colorClass: 'border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5 dark:bg-yellow-500/10', isLeft: false };
  }
  // Right Ring
  if (['9', 'o', 'l', '.'].includes(k)) {
    return { name: 'Farta faraantiga ee gacanta Midig (Right Ring)', colorClass: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10', isLeft: false };
  }
  // Right Pinky
  return { name: 'Far yareeyda ee gacanta Midig (Right Pinky)', colorClass: 'border-rose-500 text-rose-500 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10', isLeft: false };
};

const mapCharToKey = (char: string): { key: string; requiresShift: boolean } => {
  if (!char) return { key: '', requiresShift: false };

  if (char === ' ') return { key: 'space', requiresShift: false };

  if (char >= 'A' && char <= 'Z') {
    return { key: char, requiresShift: true };
  }

  if (char >= 'a' && char <= 'z') {
    return { key: char.toUpperCase(), requiresShift: false };
  }

  if (char >= '0' && char <= '9') {
    return { key: char, requiresShift: false };
  }

  const symbolMap: Record<string, { key: string; requiresShift: boolean }> = {
    '!': { key: '1', requiresShift: true },
    '@': { key: '2', requiresShift: true },
    '#': { key: '3', requiresShift: true },
    '$': { key: '4', requiresShift: true },
    '%': { key: '5', requiresShift: true },
    '^': { key: '6', requiresShift: true },
    '&': { key: '7', requiresShift: true },
    '*': { key: '8', requiresShift: true },
    '(': { key: '9', requiresShift: true },
    ')': { key: '0', requiresShift: true },
    '-': { key: '-', requiresShift: false },
    '_': { key: '-', requiresShift: true },
    '=': { key: '=', requiresShift: false },
    '+': { key: '=', requiresShift: true },
    ';': { key: ';', requiresShift: false },
    ':': { key: ';', requiresShift: true },
    "'": { key: "'", requiresShift: false },
    '"': { key: "'", requiresShift: true },
    ',': { key: ',', requiresShift: false },
    '<': { key: ',', requiresShift: true },
    '.': { key: '.', requiresShift: false },
    '>': { key: '.', requiresShift: true },
    '/': { key: '/', requiresShift: false },
    '?': { key: '/', requiresShift: true },
    '\\': { key: '\\', requiresShift: false },
    '|': { key: '\\', requiresShift: true },
    '[': { key: '[', requiresShift: false },
    '{': { key: '[', requiresShift: true },
    ']': { key: ']', requiresShift: false },
    '}': { key: ']', requiresShift: true },
    '`': { key: '`', requiresShift: false },
    '~': { key: '`', requiresShift: true },
    "’": { key: "'", requiresShift: false },
    "‘": { key: "'", requiresShift: false },
  };

  return symbolMap[char] || { key: char.toUpperCase(), requiresShift: false };
};

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ nextChar, isCapsLockOn }) => {
  const { key: targetKey, requiresShift } = mapCharToKey(nextChar);
  const activeFinger = getFingerInfo(targetKey);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [keyCoords, setKeyCoords] = React.useState<Record<string, { x: number; y: number; w: number; h: number }>>({});

  const measureKeys = React.useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const elements = containerRef.current.querySelectorAll('[data-key]');
    const coords: Record<string, { x: number; y: number; w: number; h: number }> = {};
    elements.forEach((el) => {
      const keyAttr = el.getAttribute('data-key');
      if (keyAttr) {
        const rect = el.getBoundingClientRect();
        coords[keyAttr] = {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          w: rect.width,
          h: rect.height,
        };
      }
    });
    setKeyCoords(coords);
  }, []);

  React.useEffect(() => {
    measureKeys();
    window.addEventListener('resize', measureKeys);

    // Also use ResizeObserver for container size changes
    const observer = new ResizeObserver(() => {
      measureKeys();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Measure after short delays to handle initial mount layout passes
    const timer1 = setTimeout(measureKeys, 50);
    const timer2 = setTimeout(measureKeys, 150);

    return () => {
      window.removeEventListener('resize', measureKeys);
      observer.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [measureKeys, nextChar]);

  // Parse active finger for hands outline rendering
  let activeFingerName = '';
  if (activeFinger) {
    const fn = activeFinger.name.toLowerCase();
    if (fn.includes('suulka') || fn.includes('thumb')) {
      activeFingerName = 'thumb';
    } else if (fn.includes('bidix') || fn.includes('left')) {
      if (fn.includes('yariisada') || fn.includes('pinky')) activeFingerName = 'left-pinky';
      else if (fn.includes('gurey') || fn.includes('ring')) activeFingerName = 'left-ring';
      else if (fn.includes('dhexe') || fn.includes('middle')) activeFingerName = 'left-middle';
      else if (fn.includes('murugta') || fn.includes('index')) activeFingerName = 'left-index';
    } else {
      if (fn.includes('yariisada') || fn.includes('pinky')) activeFingerName = 'right-pinky';
      else if (fn.includes('gurey') || fn.includes('ring')) activeFingerName = 'right-ring';
      else if (fn.includes('dhexe') || fn.includes('middle')) activeFingerName = 'right-middle';
      else if (fn.includes('murugta') || fn.includes('index')) activeFingerName = 'right-index';
    }
  }

  const rows = [
    [
      { label: '`', code: '`', shift: '~', width: 'w-10 md:w-12' },
      { label: '1', code: '1', shift: '!', width: 'w-10 md:w-12' },
      { label: '2', code: '2', shift: '@', width: 'w-10 md:w-12' },
      { label: '3', code: '3', shift: '#', width: 'w-10 md:w-12' },
      { label: '4', code: '4', shift: '$', width: 'w-10 md:w-12' },
      { label: '5', code: '5', shift: '%', width: 'w-10 md:w-12' },
      { label: '6', code: '6', shift: '^', width: 'w-10 md:w-12' },
      { label: '7', code: '7', shift: '&', width: 'w-10 md:w-12' },
      { label: '8', code: '8', shift: '*', width: 'w-10 md:w-12' },
      { label: '9', code: '9', shift: '(', width: 'w-10 md:w-12' },
      { label: '0', code: '0', shift: ')', width: 'w-10 md:w-12' },
      { label: '-', code: '-', shift: '_', width: 'w-10 md:w-12' },
      { label: '=', code: '=', shift: '+', width: 'w-10 md:w-12' },
      { label: 'Backspace', code: 'backspace', width: 'flex-1 min-w-[70px]' },
    ],
    [
      { label: 'Tab', code: 'tab', width: 'w-[56px] md:w-[68px]' },
      { label: 'Q', code: 'Q', width: 'w-10 md:w-12' },
      { label: 'W', code: 'W', width: 'w-10 md:w-12' },
      { label: 'E', code: 'E', width: 'w-10 md:w-12' },
      { label: 'R', code: 'R', width: 'w-10 md:w-12' },
      { label: 'T', code: 'T', width: 'w-10 md:w-12' },
      { label: 'Y', code: 'Y', width: 'w-10 md:w-12' },
      { label: 'U', code: 'U', width: 'w-10 md:w-12' },
      { label: 'I', code: 'I', width: 'w-10 md:w-12' },
      { label: 'O', code: 'O', width: 'w-10 md:w-12' },
      { label: 'P', code: 'P', width: 'w-10 md:w-12' },
      { label: '[', code: '[', shift: '{', width: 'w-10 md:w-12' },
      { label: ']', code: ']', shift: '}', width: 'w-10 md:w-12' },
      { label: '\\', code: '\\', shift: '|', width: 'w-10 md:w-12' },
    ],
    [
      { label: 'Caps', code: 'caps', width: 'w-[64px] md:w-[78px]' },
      { label: 'A', code: 'A', width: 'w-10 md:w-12' },
      { label: 'S', code: 'S', width: 'w-10 md:w-12' },
      { label: 'D', code: 'D', width: 'w-10 md:w-12' },
      { label: 'F', code: 'F', width: 'w-10 md:w-12' },
      { label: 'G', code: 'G', width: 'w-10 md:w-12' },
      { label: 'H', code: 'H', width: 'w-10 md:w-12' },
      { label: 'J', code: 'J', width: 'w-10 md:w-12' },
      { label: 'K', code: 'K', width: 'w-10 md:w-12' },
      { label: 'L', code: 'L', width: 'w-10 md:w-12' },
      { label: ';', code: ';', shift: ':', width: 'w-10 md:w-12' },
      { label: "'", code: "'", shift: '"', width: 'w-10 md:w-12' },
      { label: 'Enter', code: 'enter', width: 'flex-1 min-w-[70px]' },
    ],
    [
      { label: 'Shift', code: 'shift-l', width: 'w-[80px] md:w-[98px]' },
      { label: 'Z', code: 'Z', width: 'w-10 md:w-12' },
      { label: 'X', code: 'X', width: 'w-10 md:w-12' },
      { label: 'C', code: 'C', width: 'w-10 md:w-12' },
      { label: 'V', code: 'V', width: 'w-10 md:w-12' },
      { label: 'B', code: 'B', width: 'w-10 md:w-12' },
      { label: 'N', code: 'N', width: 'w-10 md:w-12' },
      { label: 'M', code: 'M', width: 'w-10 md:w-12' },
      { label: ',', code: ',', shift: '<', width: 'w-10 md:w-12' },
      { label: '.', code: '.', shift: '>', width: 'w-10 md:w-12' },
      { label: '/', code: '/', shift: '?', width: 'w-10 md:w-12' },
      { label: 'Shift', code: 'shift-r', width: 'flex-1 min-w-[65px]' },
    ],
    [
      { label: 'Spacebar', code: 'space', width: 'w-[280px] md:w-[380px] mx-auto' }
    ]
  ];

  // Check if we have all the coordinates needed for overlaying the hands
  const hasCoords = !!(keyCoords['A'] && keyCoords['S'] && keyCoords['D'] && keyCoords['F'] && keyCoords['J'] && keyCoords['K'] && keyCoords['L'] && keyCoords[';'] && keyCoords['space']);

  let leftHandPaths = { pinky: '', ring: '', middle: '', index: '', thumb: '', palm: '' };
  let rightHandPaths = { pinky: '', ring: '', middle: '', index: '', thumb: '', palm: '' };

  if (hasCoords && containerRef.current) {
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const a = keyCoords['A'];
    const s = keyCoords['S'];
    const d = keyCoords['D'];
    const f = keyCoords['F'];
    const sp = keyCoords['space'];

    // Left hand wrist points (at the bottom of the keyboard container)
    const lWristL = { x: containerWidth * 0.22, y: containerHeight };
    const lWristR = { x: containerWidth * 0.40, y: containerHeight };

    // Cleft/valleys between fingers
    const lPinkyRingCleft = { x: (a.x + a.w + s.x) / 2, y: Math.max(a.y + a.h, s.y + s.h) + 12 };
    const lRingMiddleCleft = { x: (s.x + s.w + d.x) / 2, y: Math.max(s.y + s.h, d.y + d.h) + 12 };
    const lMiddleIndexCleft = { x: (d.x + d.w + f.x) / 2, y: Math.max(d.y + d.h, f.y + f.h) + 12 };
    const lIndexThumbCleft = { x: f.x + f.w + 4, y: f.y + f.h * 1.4 };

    const lOuterPalm = { x: Math.max(10, a.x - 20), y: (a.y + a.h + containerHeight) / 2 };

    // Pinky Finger (key A)
    leftHandPaths.pinky = `M ${lOuterPalm.x},${lOuterPalm.y} 
                           L ${a.x + a.w * 0.05},${a.y + a.h * 0.3} 
                           A ${a.w * 0.45},${a.w * 0.45} 0 0 1 ${a.x + a.w * 0.95},${a.y + a.h * 0.3} 
                           L ${lPinkyRingCleft.x},${lPinkyRingCleft.y}`;

    // Ring Finger (key S)
    leftHandPaths.ring = `M ${lPinkyRingCleft.x},${lPinkyRingCleft.y} 
                          L ${s.x + s.w * 0.05},${s.y + s.h * 0.2} 
                          A ${s.w * 0.45},${s.w * 0.45} 0 0 1 ${s.x + s.w * 0.95},${s.y + s.h * 0.2} 
                          L ${lRingMiddleCleft.x},${lRingMiddleCleft.y}`;

    // Middle Finger (key D)
    leftHandPaths.middle = `M ${lRingMiddleCleft.x},${lRingMiddleCleft.y} 
                            L ${d.x + d.w * 0.05},${d.y + d.h * 0.15} 
                            A ${d.w * 0.45},${d.w * 0.45} 0 0 1 ${d.x + d.w * 0.95},${d.y + d.h * 0.15} 
                            L ${lMiddleIndexCleft.x},${lMiddleIndexCleft.y}`;

    // Index Finger (key F)
    leftHandPaths.index = `M ${lMiddleIndexCleft.x},${lMiddleIndexCleft.y} 
                           L ${f.x + f.w * 0.05},${f.y + f.h * 0.2} 
                           A ${f.w * 0.45},${f.w * 0.45} 0 0 1 ${f.x + f.w * 0.95},${f.y + f.h * 0.2} 
                           L ${lIndexThumbCleft.x},${lIndexThumbCleft.y}`;

    // Thumb (key space, left half)
    const lThumbTipL = sp.x + sp.w * 0.20;
    const lThumbTipR = sp.x + sp.w * 0.36;
    const lThumbTipY = sp.y + sp.h * 0.15;
    leftHandPaths.thumb = `M ${lIndexThumbCleft.x},${lIndexThumbCleft.y} 
                           C ${f.x + f.w * 0.5},${f.y + f.h * 2.1} ${lThumbTipL - 12},${lThumbTipY + 12} ${lThumbTipL},${lThumbTipY} 
                           A ${sp.h * 0.35},${sp.h * 0.35} 0 0 1 ${lThumbTipR},${lThumbTipY + 8}
                           L ${lWristR.x},${lWristR.y}`;

    // Palm base outer line
    leftHandPaths.palm = `M ${lWristL.x},${lWristL.y} C ${lWristL.x - 20},${containerHeight * 0.85} ${lOuterPalm.x - 10},${lOuterPalm.y + 40} ${lOuterPalm.x},${lOuterPalm.y}`;


    const j = keyCoords['J'];
    const k = keyCoords['K'];
    const l = keyCoords['L'];
    const semi = keyCoords[';'];

    // Right hand wrist points
    const rWristL = { x: containerWidth * 0.60, y: containerHeight };
    const rWristR = { x: containerWidth * 0.78, y: containerHeight };

    // Cleft/valleys between fingers
    const rIndexThumbCleft = { x: j.x - 4, y: j.y + j.h * 1.4 };
    const rIndexMiddleCleft = { x: (j.x + j.w + k.x) / 2, y: Math.max(j.y + j.h, k.y + k.h) + 12 };
    const rMiddleRingCleft = { x: (k.x + k.w + l.x) / 2, y: Math.max(k.y + k.h, l.y + l.h) + 12 };
    const rRingPinkyCleft = { x: (l.x + l.w + semi.x) / 2, y: Math.max(l.y + l.h, semi.y + semi.h) + 12 };

    const rOuterPalm = { x: Math.min(containerWidth - 10, semi.x + semi.w + 20), y: (semi.y + semi.h + containerHeight) / 2 };

    // Thumb (key space, right half)
    const rThumbTipL = sp.x + sp.w * 0.64;
    const rThumbTipR = sp.x + sp.w * 0.80;
    const rThumbTipY = sp.y + sp.h * 0.15;
    rightHandPaths.thumb = `M ${rWristL.x},${rWristL.y} 
                            L ${rThumbTipL},${rThumbTipY + 8} 
                            A ${sp.h * 0.35},${sp.h * 0.35} 0 0 1 ${rThumbTipR},${rThumbTipY}
                            C ${rThumbTipR + 12},${rThumbTipY + 12} ${j.x - j.w * 0.5},${j.y + j.h * 2.1} ${rIndexThumbCleft.x},${rIndexThumbCleft.y}`;

    // Index Finger (key J)
    rightHandPaths.index = `M ${rIndexThumbCleft.x},${rIndexThumbCleft.y} 
                            L ${j.x + j.w * 0.05},${j.y + j.h * 0.2} 
                            A ${j.w * 0.45},${j.w * 0.45} 0 0 1 ${j.x + j.w * 0.95},${j.y + j.h * 0.2} 
                            L ${rIndexMiddleCleft.x},${rIndexMiddleCleft.y}`;

    // Middle Finger (key K)
    rightHandPaths.middle = `M ${rIndexMiddleCleft.x},${rIndexMiddleCleft.y} 
                             L ${k.x + k.w * 0.05},${k.y + k.h * 0.15} 
                             A ${k.w * 0.45},${k.w * 0.45} 0 0 1 ${k.x + k.w * 0.95},${k.y + k.h * 0.15} 
                             L ${rMiddleRingCleft.x},${rMiddleRingCleft.y}`;

    // Ring Finger (key L)
    rightHandPaths.ring = `M ${rMiddleRingCleft.x},${rMiddleRingCleft.y} 
                           L ${l.x + l.w * 0.05},${l.y + l.h * 0.2} 
                           A ${l.w * 0.45},${l.w * 0.45} 0 0 1 ${l.x + l.w * 0.95},${l.y + l.h * 0.2} 
                           L ${rRingPinkyCleft.x},${rRingPinkyCleft.y}`;

    // Pinky Finger (key ;)
    rightHandPaths.pinky = `M ${rRingPinkyCleft.x},${rRingPinkyCleft.y} 
                            L ${semi.x + semi.w * 0.05},${semi.y + semi.h * 0.3} 
                            A ${semi.w * 0.45},${semi.w * 0.45} 0 0 1 ${semi.x + semi.w * 0.95},${semi.y + semi.h * 0.3} 
                            L ${rOuterPalm.x},${rOuterPalm.y}`;

    // Palm base outer line
    rightHandPaths.palm = `M ${rOuterPalm.x},${rOuterPalm.y} C ${rOuterPalm.x + 10},${rOuterPalm.y + 40} ${rWristR.x + 20},${containerHeight * 0.85} ${rWristR.x},${rWristR.y}`;
  }

  return (
    <div className="w-full flex flex-col gap-6 items-center justify-center select-none mt-2">
      {/* Keyboard Grid */}
      <div className="flex flex-col gap-4 w-full md:w-auto">
        {/* Active Finger Display */}
        {targetKey && (
          <div className="flex justify-center items-center gap-3 py-2 px-4 rounded-xl border glass-panel transition-all duration-300">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Farta Xigta (Next Finger):
            </div>
            <div className={`text-base font-semibold px-3 py-1 rounded-md border ${activeFinger.colorClass}`}>
              {activeFinger.name}
            </div>
          </div>
        )}

        <div ref={containerRef} className="relative p-3 md:p-4 rounded-2xl glass-panel flex flex-col gap-1.5 md:gap-2 max-w-4xl mx-auto w-full">
          {/* Overlay SVG Hands directly on top of the keyboard keys */}
          {hasCoords && (
            <div className="absolute inset-0 pointer-events-none z-10 w-full h-full opacity-80">
              <svg className="w-full h-full text-zinc-400 dark:text-zinc-500 transition-colors duration-300" style={{ overflow: 'visible' }}>
                {/* Left Hand Paths */}
                <path d={leftHandPaths.palm} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d={leftHandPaths.pinky} fill={activeFingerName === 'left-pinky' ? 'rgba(244,63,94,0.06)' : 'none'}
                  stroke={activeFingerName === 'left-pinky' ? '#f43f5e' : 'currentColor'}
                  strokeWidth={activeFingerName === 'left-pinky' ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'left-pinky' ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'left-pinky' ? 'filter drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]' : ''}`} />
                <path d={leftHandPaths.ring} fill={activeFingerName === 'left-ring' ? 'rgba(245,158,11,0.06)' : 'none'}
                  stroke={activeFingerName === 'left-ring' ? '#f59e0b' : 'currentColor'}
                  strokeWidth={activeFingerName === 'left-ring' ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'left-ring' ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'left-ring' ? 'filter drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]' : ''}`} />
                <path d={leftHandPaths.middle} fill={activeFingerName === 'left-middle' ? 'rgba(234,179,8,0.06)' : 'none'}
                  stroke={activeFingerName === 'left-middle' ? '#eab308' : 'currentColor'}
                  strokeWidth={activeFingerName === 'left-middle' ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'left-middle' ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'left-middle' ? 'filter drop-shadow-[0_0_8px_rgba(234,179,8,0.7)]' : ''}`} />
                <path d={leftHandPaths.index} fill={activeFingerName === 'left-index' ? 'rgba(16,185,129,0.06)' : 'none'}
                  stroke={activeFingerName === 'left-index' ? '#10b981' : 'currentColor'}
                  strokeWidth={activeFingerName === 'left-index' ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'left-index' ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'left-index' ? 'filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' : ''}`} />
                <path d={leftHandPaths.thumb} fill={activeFingerName === 'thumb' && activeFinger.isLeft ? 'rgba(59,130,246,0.06)' : 'none'}
                  stroke={activeFingerName === 'thumb' && activeFinger.isLeft ? '#3b82f6' : 'currentColor'}
                  strokeWidth={activeFingerName === 'thumb' && activeFinger.isLeft ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'thumb' && activeFinger.isLeft ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'thumb' && activeFinger.isLeft ? 'filter drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]' : ''}`} />

                {/* Right Hand Paths */}
                <path d={rightHandPaths.palm} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d={rightHandPaths.thumb} fill={activeFingerName === 'thumb' && !activeFinger.isLeft ? 'rgba(59,130,246,0.06)' : 'none'}
                  stroke={activeFingerName === 'thumb' && !activeFinger.isLeft ? '#3b82f6' : 'currentColor'}
                  strokeWidth={activeFingerName === 'thumb' && !activeFinger.isLeft ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'thumb' && !activeFinger.isLeft ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'thumb' && !activeFinger.isLeft ? 'filter drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]' : ''}`} />
                <path d={rightHandPaths.index} fill={activeFingerName === 'right-index' ? 'rgba(16,185,129,0.06)' : 'none'}
                  stroke={activeFingerName === 'right-index' ? '#10b981' : 'currentColor'}
                  strokeWidth={activeFingerName === 'right-index' ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'right-index' ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'right-index' ? 'filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' : ''}`} />
                <path d={rightHandPaths.middle} fill={activeFingerName === 'right-middle' ? 'rgba(234,179,8,0.06)' : 'none'}
                  stroke={activeFingerName === 'right-middle' ? '#eab308' : 'currentColor'}
                  strokeWidth={activeFingerName === 'right-middle' ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'right-middle' ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'right-middle' ? 'filter drop-shadow-[0_0_8px_rgba(234,179,8,0.7)]' : ''}`} />
                <path d={rightHandPaths.ring} fill={activeFingerName === 'right-ring' ? 'rgba(245,158,11,0.06)' : 'none'}
                  stroke={activeFingerName === 'right-ring' ? '#f59e0b' : 'currentColor'}
                  strokeWidth={activeFingerName === 'right-ring' ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'right-ring' ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'right-ring' ? 'filter drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]' : ''}`} />
                <path d={rightHandPaths.pinky} fill={activeFingerName === 'right-pinky' ? 'rgba(244,63,94,0.06)' : 'none'}
                  stroke={activeFingerName === 'right-pinky' ? '#f43f5e' : 'currentColor'}
                  strokeWidth={activeFingerName === 'right-pinky' ? '2.5' : '1.5'}
                  strokeDasharray={activeFingerName === 'right-pinky' ? 'none' : '3 3'}
                  className={`transition-all duration-200 ${activeFingerName === 'right-pinky' ? 'filter drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]' : ''}`} />
              </svg>
            </div>
          )}

          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-between md:justify-center gap-1.5 md:gap-2">
              {row.map((k) => {
                const isActive = targetKey === k.code;
                const isShiftActive = (k.code === 'shift-l' || k.code === 'shift-r') && requiresShift;
                const isCapsActive = k.code === 'caps' && isCapsLockOn;
                const finger = getFingerInfo(k.code);

                let baseClass = "h-10 md:h-12 rounded-lg flex flex-col items-center justify-center text-xs md:text-sm font-medium border transition-all duration-200 ";
                let activeClass = "";

                if (isActive) {
                  if (k.code === 'space') {
                    activeClass = "bg-blue-500 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse scale-[0.98]";
                  } else if (finger.colorClass.includes('rose')) {
                    activeClass = "bg-rose-500 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse scale-[0.98]";
                  } else if (finger.colorClass.includes('amber')) {
                    activeClass = "bg-amber-500 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse scale-[0.98]";
                  } else if (finger.colorClass.includes('yellow')) {
                    activeClass = "bg-yellow-500 border-yellow-500 text-black dark:text-black shadow-[0_0_15px_rgba(234,179,8,0.6)] animate-pulse scale-[0.98]";
                  } else {
                    activeClass = "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse scale-[0.98]";
                  }
                } else if (isShiftActive) {
                  activeClass = "bg-rose-500 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse";
                } else if (isCapsActive) {
                  activeClass = "bg-rose-500/25 border-rose-500 text-rose-500 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse";
                } else {
                  baseClass += "bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300";
                }

                return (
                  <div
                    key={k.code}
                    data-key={k.code}
                    className={`${k.width} ${baseClass} ${activeClass}`}
                  >
                    <span className="font-semibold">{k.label}</span>
                    {k.shift && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 -mt-1">{k.shift}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VirtualKeyboard;
