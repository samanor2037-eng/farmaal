import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Keyboard, BookOpen, Info, HelpCircle, Check } from 'lucide-react';

interface KeyboardGuideModalProps {
  onClose: () => void;
}

const guideSequence = ['A', 'S', 'D', 'F', 'space', 'J', 'K', 'L', ';', 'space'];

const getFingerGuideInfo = (key: string) => {
  const k = key.toLowerCase();
  if (k === 'a') {
    return {
      fingerName: 'Yariisada Bidix (Left Pinky)',
      color: '#f43f5e',
      colorClass: 'border-rose-500 text-rose-500 bg-rose-500/10',
      desc: 'Farta Yariisada ee gacanta bidix saar key-ga "A". Waa booska bilowga ah ee safka dhexe.',
      fingerId: 'left-pinky',
      coordsKey: 'A'
    };
  }
  if (k === 's') {
    return {
      fingerName: 'Gureyga Bidix (Left Ring)',
      color: '#f59e0b',
      colorClass: 'border-amber-500 text-amber-600 bg-amber-500/10',
      desc: 'Farta Gurey ee gacanta bidix saar key-ga "S".',
      fingerId: 'left-ring',
      coordsKey: 'S'
    };
  }
  if (k === 'd') {
    return {
      fingerName: 'Dhexada Bidix (Left Middle)',
      color: '#eab308',
      colorClass: 'border-yellow-500 text-yellow-600 bg-yellow-500/10',
      desc: 'Farta Dhexe ee gacanta bidix saar key-ga "D".',
      fingerId: 'left-middle',
      coordsKey: 'D'
    };
  }
  if (k === 'f') {
    return {
      fingerName: 'Murugta Bidix (Left Index)',
      color: '#10b981',
      colorClass: 'border-emerald-500 text-emerald-600 bg-emerald-500/10',
      desc: 'Farta Murugta ee gacanta bidix saar key-ga "F". Waa booska fure ee far-muujinta.',
      fingerId: 'left-index',
      coordsKey: 'F'
    };
  }
  if (k === 'space') {
    return {
      fingerName: 'Suulka (Thumb - Bidix/Midig)',
      color: '#3b82f6',
      colorClass: 'border-blue-500 text-blue-600 bg-blue-500/10',
      desc: 'Suulka (midig ama bidix) u isticmaal Spacebar si aad u samayso ku-talax casharka dhexdooda.',
      fingerId: 'thumb',
      coordsKey: 'space'
    };
  }
  if (k === 'j') {
    return {
      fingerName: 'Murugta Midig (Right Index)',
      color: '#10b981',
      colorClass: 'border-emerald-500 text-emerald-600 bg-emerald-500/10',
      desc: 'Farta Murugta ee gacanta midig saar key-ga "J". Waa booska fure ee far-muujinta midig.',
      fingerId: 'right-index',
      coordsKey: 'J'
    };
  }
  if (k === 'k') {
    return {
      fingerName: 'Dhexada Midig (Right Middle)',
      color: '#eab308',
      colorClass: 'border-yellow-500 text-yellow-600 bg-yellow-500/10',
      desc: 'Farta Dhexe ee gacanta midig saar key-ga "K".',
      fingerId: 'right-middle',
      coordsKey: 'K'
    };
  }
  if (k === 'l') {
    return {
      fingerName: 'Gureyga Midig (Right Ring)',
      color: '#f59e0b',
      colorClass: 'border-amber-500 text-amber-600 bg-amber-500/10',
      desc: 'Farta Gurey ee gacanta midig saar key-ga "L".',
      fingerId: 'right-ring',
      coordsKey: 'L'
    };
  }
  if (k === ';') {
    return {
      fingerName: 'Yariisada Midig (Right Pinky)',
      color: '#f43f5e',
      colorClass: 'border-rose-500 text-rose-500 bg-rose-500/10',
      desc: 'Farta Yariisada ee gacanta midig saar key-ga ";". Waa xadka midig ee safka dhexe.',
      fingerId: 'right-pinky',
      coordsKey: ';'
    };
  }
  return null;
};

const getFingerZoneColor = (key: string): string => {
  const k = key.toLowerCase();
  if (['1', 'q', 'a', 'z', 'shift-l', 'caps'].includes(k)) {
    return 'border-rose-500/20 bg-rose-500/5 text-rose-650 dark:text-rose-400';
  }
  if (['2', 'w', 's', 'x'].includes(k)) {
    return 'border-amber-500/20 bg-amber-500/5 text-amber-650 dark:text-amber-400';
  }
  if (['3', 'e', 'd', 'c'].includes(k)) {
    return 'border-yellow-500/20 bg-yellow-500/5 text-yellow-650 dark:text-yellow-400';
  }
  if (['4', '5', 'r', 't', 'f', 'g', 'v', 'b'].includes(k)) {
    return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-650 dark:text-emerald-400';
  }
  if (['6', '7', 'y', 'u', 'h', 'j', 'n', 'm'].includes(k)) {
    return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-650 dark:text-emerald-400';
  }
  if (['8', 'i', 'k', ','].includes(k)) {
    return 'border-yellow-500/20 bg-yellow-500/5 text-yellow-650 dark:text-yellow-400';
  }
  if (['9', 'o', 'l', '.'].includes(k)) {
    return 'border-amber-500/20 bg-amber-500/5 text-amber-650 dark:text-amber-400';
  }
  if (['0', 'p', ';', "'", '/', '=', '-', 'shift-r', 'enter', 'backspace'].includes(k)) {
    return 'border-rose-500/20 bg-rose-500/5 text-rose-650 dark:text-rose-400';
  }
  if (k === 'space') {
    return 'border-blue-500/20 bg-blue-500/5 text-blue-650 dark:text-blue-400';
  }
  return 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-650 dark:text-zinc-350';
};

const getFingerTipCoords = (fingerId: string, coords: Record<string, { x: number; y: number; w: number; h: number }>) => {
  if (!coords) return null;
  switch (fingerId) {
    case 'left-pinky':
      if (coords['A']) return { x: coords['A'].x + coords['A'].w * 0.5, y: coords['A'].y + coords['A'].h * 0.3 };
      break;
    case 'left-ring':
      if (coords['S']) return { x: coords['S'].x + coords['S'].w * 0.5, y: coords['S'].y + coords['S'].h * 0.2 };
      break;
    case 'left-middle':
      if (coords['D']) return { x: coords['D'].x + coords['D'].w * 0.5, y: coords['D'].y + coords['D'].h * 0.15 };
      break;
    case 'left-index':
      if (coords['F']) return { x: coords['F'].x + coords['F'].w * 0.5, y: coords['F'].y + coords['F'].h * 0.2 };
      break;
    case 'thumb':
      if (coords['space']) return { x: coords['space'].x + coords['space'].w * 0.3, y: coords['space'].y + coords['space'].h * 0.2 };
      break;
    case 'right-index':
      if (coords['J']) return { x: coords['J'].x + coords['J'].w * 0.5, y: coords['J'].y + coords['J'].h * 0.2 };
      break;
    case 'right-middle':
      if (coords['K']) return { x: coords['K'].x + coords['K'].w * 0.5, y: coords['K'].y + coords['K'].h * 0.15 };
      break;
    case 'right-ring':
      if (coords['L']) return { x: coords['L'].x + coords['L'].w * 0.5, y: coords['L'].y + coords['L'].h * 0.2 };
      break;
    case 'right-pinky':
      if (coords[';']) return { x: coords[';'].x + coords[';'].w * 0.5, y: coords[';'].y + coords[';'].h * 0.3 };
      break;
  }
  return null;
};

export const KeyboardGuideModal: React.FC<KeyboardGuideModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'finger' | 'tips' | 'works'>('finger');
  const [activeFingerIdx, setActiveFingerIdx] = useState(0);
  const [keyCoords, setKeyCoords] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Play animation loop
  useEffect(() => {
    if (activeTab !== 'finger') return;
    const interval = setInterval(() => {
      setActiveFingerIdx((prev) => (prev + 1) % guideSequence.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [activeTab]);

  const measureKeys = useCallback(() => {
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

  useEffect(() => {
    if (activeTab !== 'finger') return;

    measureKeys();
    window.addEventListener('resize', measureKeys);

    const observer = new ResizeObserver(() => {
      measureKeys();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const timer1 = setTimeout(measureKeys, 80);
    const timer2 = setTimeout(measureKeys, 250);

    return () => {
      window.removeEventListener('resize', measureKeys);
      observer.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [activeTab, measureKeys]);

  const targetKey = guideSequence[activeFingerIdx];
  const activeFinger = getFingerGuideInfo(targetKey);
  const activeFingerName = activeFinger?.fingerId || '';

  const rows = [
    [
      { label: '`', code: '`', shift: '~', width: 'w-7 sm:w-9' },
      { label: '1', code: '1', shift: '!', width: 'w-7 sm:w-9' },
      { label: '2', code: '2', shift: '@', width: 'w-7 sm:w-9' },
      { label: '3', code: '3', shift: '#', width: 'w-7 sm:w-9' },
      { label: '4', code: '4', shift: '$', width: 'w-7 sm:w-9' },
      { label: '5', code: '5', shift: '%', width: 'w-7 sm:w-9' },
      { label: '6', code: '6', shift: '^', width: 'w-7 sm:w-9' },
      { label: '7', code: '7', shift: '&', width: 'w-7 sm:w-9' },
      { label: '8', code: '8', shift: '*', width: 'w-7 sm:w-9' },
      { label: '9', code: '9', shift: '(', width: 'w-7 sm:w-9' },
      { label: '0', code: '0', shift: ')', width: 'w-7 sm:w-9' },
      { label: '-', code: '-', shift: '_', width: 'w-7 sm:w-9' },
      { label: '=', code: '=', shift: '+', width: 'w-7 sm:w-9' },
      { label: '←', code: 'backspace', width: 'flex-1 min-w-[32px]' },
    ],
    [
      { label: 'Tab', code: 'tab', width: 'w-10 sm:w-12' },
      { label: 'Q', code: 'Q', width: 'w-7 sm:w-9' },
      { label: 'W', code: 'W', width: 'w-7 sm:w-9' },
      { label: 'E', code: 'E', width: 'w-7 sm:w-9' },
      { label: 'R', code: 'R', width: 'w-7 sm:w-9' },
      { label: 'T', code: 'T', width: 'w-7 sm:w-9' },
      { label: 'Y', code: 'Y', width: 'w-7 sm:w-9' },
      { label: 'U', code: 'U', width: 'w-7 sm:w-9' },
      { label: 'I', code: 'I', width: 'w-7 sm:w-9' },
      { label: 'O', code: 'O', width: 'w-7 sm:w-9' },
      { label: 'P', code: 'P', width: 'w-7 sm:w-9' },
      { label: '[', code: '[', shift: '{', width: 'w-7 sm:w-9' },
      { label: ']', code: ']', shift: '}', width: 'w-7 sm:w-9' },
      { label: '\\', code: '\\', shift: '|', width: 'w-7 sm:w-9' },
    ],
    [
      { label: 'Caps', code: 'caps', width: 'w-12 sm:w-14' },
      { label: 'A', code: 'A', width: 'w-7 sm:w-9' },
      { label: 'S', code: 'S', width: 'w-7 sm:w-9' },
      { label: 'D', code: 'D', width: 'w-7 sm:w-9' },
      { label: 'F', code: 'F', width: 'w-7 sm:w-9' },
      { label: 'G', code: 'G', width: 'w-7 sm:w-9' },
      { label: 'H', code: 'H', width: 'w-7 sm:w-9' },
      { label: 'J', code: 'J', width: 'w-7 sm:w-9' },
      { label: 'K', code: 'K', width: 'w-7 sm:w-9' },
      { label: 'L', code: 'L', width: 'w-7 sm:w-9' },
      { label: ';', code: ';', shift: ':', width: 'w-7 sm:w-9' },
      { label: "'", code: "'", shift: '"', width: 'w-7 sm:w-9' },
      { label: 'Enter', code: 'enter', width: 'flex-1 min-w-[44px]' },
    ],
    [
      { label: 'Shift', code: 'shift-l', width: 'w-14 sm:w-18' },
      { label: 'Z', code: 'Z', width: 'w-7 sm:w-9' },
      { label: 'X', code: 'X', width: 'w-7 sm:w-9' },
      { label: 'C', code: 'C', width: 'w-7 sm:w-9' },
      { label: 'V', code: 'V', width: 'w-7 sm:w-9' },
      { label: 'B', code: 'B', width: 'w-7 sm:w-9' },
      { label: 'N', code: 'N', width: 'w-7 sm:w-9' },
      { label: 'M', code: 'M', width: 'w-7 sm:w-9' },
      { label: ',', code: ',', shift: '<', width: 'w-7 sm:w-9' },
      { label: '.', code: '.', shift: '>', width: 'w-7 sm:w-9' },
      { label: '/', code: '/', shift: '?', width: 'w-7 sm:w-9' },
      { label: 'Shift', code: 'shift-r', width: 'flex-1 min-w-[40px]' },
    ],
    [
      { label: 'Spacebar', code: 'space', width: 'w-48 sm:w-72 mx-auto' }
    ]
  ];

  const hasCoords = !!(
    keyCoords['A'] &&
    keyCoords['S'] &&
    keyCoords['D'] &&
    keyCoords['F'] &&
    keyCoords['J'] &&
    keyCoords['K'] &&
    keyCoords['L'] &&
    keyCoords[';'] &&
    keyCoords['space']
  );

  let leftHandPaths = { pinky: '', ring: '', middle: '', index: '', thumb: '', palm: '' };
  let rightHandPaths = { pinky: '', ring: '', middle: '', index: '', thumb: '', palm: '' };
  let activeFingerTip = null;

  if (hasCoords) {
    const containerWidth = containerRef.current?.clientWidth || 0;
    const containerHeight = containerRef.current?.clientHeight || 0;

    const a = keyCoords['A'];
    const s = keyCoords['S'];
    const d = keyCoords['D'];
    const f = keyCoords['F'];
    const sp = keyCoords['space'];

    const j = keyCoords['J'];
    const k = keyCoords['K'];
    const l = keyCoords['L'];
    const semi = keyCoords[';'];

    if (a && s && d && f && sp && j && k && l && semi) {
      // Left Hand
      const lWristL = { x: containerWidth * 0.22, y: containerHeight };
      const lWristR = { x: containerWidth * 0.40, y: containerHeight };
      const lPinkyRingCleft = { x: (a.x + a.w + s.x) / 2, y: Math.max(a.y + a.h, s.y + s.h) + 8 };
      const lRingMiddleCleft = { x: (s.x + s.w + d.x) / 2, y: Math.max(s.y + s.h, d.y + d.h) + 8 };
      const lMiddleIndexCleft = { x: (d.x + d.w + f.x) / 2, y: Math.max(d.y + d.h, f.y + f.h) + 8 };
      const lIndexThumbCleft = { x: f.x + f.w + 2, y: f.y + f.h * 1.3 };
      const lOuterPalm = { x: Math.max(8, a.x - 14), y: (a.y + a.h + containerHeight) / 2 };

      leftHandPaths.pinky = `M ${lOuterPalm.x},${lOuterPalm.y} 
                             L ${a.x + a.w * 0.05},${a.y + a.h * 0.3} 
                             A ${a.w * 0.45},${a.w * 0.45} 0 0 1 ${a.x + a.w * 0.95},${a.y + a.h * 0.3} 
                             L ${lPinkyRingCleft.x},${lPinkyRingCleft.y}`;

      leftHandPaths.ring = `M ${lPinkyRingCleft.x},${lPinkyRingCleft.y} 
                            L ${s.x + s.w * 0.05},${s.y + s.h * 0.2} 
                            A ${s.w * 0.45},${s.w * 0.45} 0 0 1 ${s.x + s.w * 0.95},${s.y + s.h * 0.2} 
                            L ${lRingMiddleCleft.x},${lRingMiddleCleft.y}`;

      leftHandPaths.middle = `M ${lRingMiddleCleft.x},${lRingMiddleCleft.y} 
                              L ${d.x + d.w * 0.05},${d.y + d.h * 0.15} 
                              A ${d.w * 0.45},${d.w * 0.45} 0 0 1 ${d.x + d.w * 0.95},${d.y + d.h * 0.15} 
                              L ${lMiddleIndexCleft.x},${lMiddleIndexCleft.y}`;

      leftHandPaths.index = `M ${lMiddleIndexCleft.x},${lMiddleIndexCleft.y} 
                             L ${f.x + f.w * 0.05},${f.y + f.h * 0.2} 
                             A ${f.w * 0.45},${f.w * 0.45} 0 0 1 ${f.x + f.w * 0.95},${f.y + f.h * 0.2} 
                             L ${lIndexThumbCleft.x},${lIndexThumbCleft.y}`;

      const lThumbTipL = sp.x + sp.w * 0.20;
      const lThumbTipR = sp.x + sp.w * 0.36;
      const lThumbTipY = sp.y + sp.h * 0.15;
      leftHandPaths.thumb = `M ${lIndexThumbCleft.x},${lIndexThumbCleft.y} 
                             C ${f.x + f.w * 0.5},${f.y + f.h * 1.8} ${lThumbTipL - 8},${lThumbTipY + 8} ${lThumbTipL},${lThumbTipY} 
                             A ${sp.h * 0.35},${sp.h * 0.35} 0 0 1 ${lThumbTipR},${lThumbTipY + 6}
                             L ${lWristR.x},${lWristR.y}`;

      leftHandPaths.palm = `M ${lWristL.x},${lWristL.y} C ${lWristL.x - 15},${containerHeight * 0.85} ${lOuterPalm.x - 8},${lOuterPalm.y + 30} ${lOuterPalm.x},${lOuterPalm.y}`;

      // Right Hand
      const rWristL = { x: containerWidth * 0.60, y: containerHeight };
      const rWristR = { x: containerWidth * 0.78, y: containerHeight };
      const rIndexThumbCleft = { x: j.x - 2, y: j.y + j.h * 1.3 };
      const rIndexMiddleCleft = { x: (j.x + j.w + k.x) / 2, y: Math.max(j.y + j.h, k.y + k.h) + 8 };
      const rMiddleRingCleft = { x: (k.x + k.w + l.x) / 2, y: Math.max(k.y + k.h, l.y + l.h) + 8 };
      const rRingPinkyCleft = { x: (l.x + l.w + semi.x) / 2, y: Math.max(l.y + l.h, semi.y + semi.h) + 8 };
      const rOuterPalm = { x: Math.min(containerWidth - 8, semi.x + semi.w + 14), y: (semi.y + semi.h + containerHeight) / 2 };

      const rThumbTipL = sp.x + sp.w * 0.64;
      const rThumbTipR = sp.x + sp.w * 0.80;
      const rThumbTipY = sp.y + sp.h * 0.15;

      rightHandPaths.thumb = `M ${rWristL.x},${rWristL.y} 
                              L ${rThumbTipL},${rThumbTipY + 6} 
                              A ${sp.h * 0.35},${sp.h * 0.35} 0 0 1 ${rThumbTipR},${rThumbTipY}
                              C ${rThumbTipR + 8},${rThumbTipY + 8} ${j.x - j.w * 0.5},${j.y + j.h * 1.8} ${rIndexThumbCleft.x},${rIndexThumbCleft.y}`;

      rightHandPaths.index = `M ${rIndexThumbCleft.x},${rIndexThumbCleft.y} 
                              L ${j.x + j.w * 0.05},${j.y + j.h * 0.2} 
                              A ${j.w * 0.45},${j.w * 0.45} 0 0 1 ${j.x + j.w * 0.95},${j.y + j.h * 0.2} 
                              L ${rIndexMiddleCleft.x},${rIndexMiddleCleft.y}`;

      rightHandPaths.middle = `M ${rIndexMiddleCleft.x},${rIndexMiddleCleft.y} 
                               L ${k.x + k.w * 0.05},${k.y + k.h * 0.15} 
                               A ${k.w * 0.45},${k.w * 0.45} 0 0 1 ${k.x + k.w * 0.95},${k.y + k.h * 0.15} 
                               L ${rMiddleRingCleft.x},${rMiddleRingCleft.y}`;

      rightHandPaths.ring = `M ${rMiddleRingCleft.x},${rMiddleRingCleft.y} 
                             L ${l.x + l.w * 0.05},${l.y + l.h * 0.2} 
                             A ${l.w * 0.45},${l.w * 0.45} 0 0 1 ${l.x + l.w * 0.95},${l.y + l.h * 0.2} 
                             L ${rRingPinkyCleft.x},${rRingPinkyCleft.y}`;

      rightHandPaths.pinky = `M ${rRingPinkyCleft.x},${rRingPinkyCleft.y} 
                              L ${semi.x + semi.w * 0.05},${semi.y + semi.h * 0.3} 
                              A ${semi.w * 0.45},${semi.w * 0.45} 0 0 1 ${semi.x + semi.w * 0.95},${semi.y + semi.h * 0.3} 
                              L ${rOuterPalm.x},${rOuterPalm.y}`;

      rightHandPaths.palm = `M ${rOuterPalm.x},${rOuterPalm.y} C ${rOuterPalm.x + 8},${rOuterPalm.y + 30} ${rWristR.x + 15},${containerHeight * 0.85} ${rWristR.x},${rWristR.y}`;

      // Calculate active fingertip coordinate
      activeFingerTip = getFingerTipCoords(activeFingerName, keyCoords);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md animate-fade-in select-none">
      {/* Modal Container */}
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100">
                Hagaha Qoraalka & Kiiboodhka
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Baro farta-saarista saxda ah iyo sida loo isticmaalo FARMAAL.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/5 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('finger')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'finger'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Farta Saarista (Fingers)</span>
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'tips'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Talooyinka Qoraalka (Tips)</span>
          </button>
          <button
            onClick={() => setActiveTab('works')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'works'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Sida App-ku u Shaqeeyo</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* TAB 1: FINGER PLACEMENT */}
          {activeTab === 'finger' && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">Mabda'a ugu Muhiimsan:</span>
                Kiiboodhka ha eegin adigoo wax qoraya! Far walba waxay leedahay xarfo gaar ah oo ay mas'uul ka tahay. Markasta oo aad xaraf riixdo, fartu waa inay ku laabataa booskeedii saxda ahaa ee safka dhexe (**Home Row**).
              </div>

              {/* Interactive Animated Keyboard/Finger Placement representation */}
              <div className="flex flex-col gap-5 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/10 relative">
                {/* Description of active action */}
                <div className="text-center min-h-[4.5rem] flex flex-col items-center justify-center gap-1 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
                  <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    HAGAL FARTA SAARISTA
                  </div>
                  <div className="text-sm font-extrabold text-zinc-800 dark:text-zinc-150 flex items-center justify-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeFinger?.color }} />
                    {activeFinger?.fingerName} ➔ Key-ga "{activeFinger?.coordsKey}"
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {activeFinger?.desc}
                  </div>
                </div>

                {/* Keyboard Grid with SVG overlay */}
                <div className="w-full flex flex-col items-center justify-center select-none relative">
                  <div ref={containerRef} className="relative p-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-900/50 flex flex-col gap-1 max-w-2xl mx-auto w-full overflow-hidden">
                    {/* SVG Hands Overlay */}
                    {hasCoords && (
                      <div className="absolute inset-0 pointer-events-none z-10 w-full h-full opacity-65">
                        <svg className="w-full h-full text-zinc-400 dark:text-zinc-600 transition-colors duration-300" style={{ overflow: 'visible' }}>
                          {/* Left Hand Paths */}
                          <path d={leftHandPaths.palm} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                          <path d={leftHandPaths.pinky} fill={activeFingerName === 'left-pinky' ? 'rgba(244,63,94,0.06)' : 'none'} 
                            stroke={activeFingerName === 'left-pinky' ? '#f43f5e' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'left-pinky' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'left-pinky' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />
                          <path d={leftHandPaths.ring} fill={activeFingerName === 'left-ring' ? 'rgba(245,158,11,0.06)' : 'none'} 
                            stroke={activeFingerName === 'left-ring' ? '#f59e0b' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'left-ring' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'left-ring' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />
                          <path d={leftHandPaths.middle} fill={activeFingerName === 'left-middle' ? 'rgba(234,179,8,0.06)' : 'none'} 
                            stroke={activeFingerName === 'left-middle' ? '#eab308' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'left-middle' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'left-middle' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />
                          <path d={leftHandPaths.index} fill={activeFingerName === 'left-index' ? 'rgba(16,185,129,0.06)' : 'none'} 
                            stroke={activeFingerName === 'left-index' ? '#10b981' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'left-index' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'left-index' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />
                          <path d={leftHandPaths.thumb} fill={activeFingerName === 'thumb' ? 'rgba(59,130,246,0.06)' : 'none'} 
                            stroke={activeFingerName === 'thumb' ? '#3b82f6' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'thumb' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'thumb' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />

                          {/* Right Hand Paths */}
                          <path d={rightHandPaths.palm} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                          <path d={rightHandPaths.thumb} fill={activeFingerName === 'thumb' ? 'rgba(59,130,246,0.06)' : 'none'} 
                            stroke={activeFingerName === 'thumb' ? '#3b82f6' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'thumb' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'thumb' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />
                          <path d={rightHandPaths.index} fill={activeFingerName === 'right-index' ? 'rgba(16,185,129,0.06)' : 'none'} 
                            stroke={activeFingerName === 'right-index' ? '#10b981' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'right-index' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'right-index' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />
                          <path d={rightHandPaths.middle} fill={activeFingerName === 'right-middle' ? 'rgba(234,179,8,0.06)' : 'none'} 
                            stroke={activeFingerName === 'right-middle' ? '#eab308' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'right-middle' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'right-middle' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />
                          <path d={rightHandPaths.ring} fill={activeFingerName === 'right-ring' ? 'rgba(245,158,11,0.06)' : 'none'} 
                            stroke={activeFingerName === 'right-ring' ? '#f59e0b' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'right-ring' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'right-ring' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />
                          <path d={rightHandPaths.pinky} fill={activeFingerName === 'right-pinky' ? 'rgba(244,63,94,0.06)' : 'none'} 
                            stroke={activeFingerName === 'right-pinky' ? '#f43f5e' : 'currentColor'} 
                            strokeWidth={activeFingerName === 'right-pinky' ? '2.5' : '1.5'} 
                            strokeDasharray={activeFingerName === 'right-pinky' ? 'none' : '3 3'} 
                            className="transition-all duration-200" />

                          {/* Pulsing Fingertip Ripple Target */}
                          {activeFingerTip && (
                            <>
                              <circle
                                cx={activeFingerTip.x}
                                cy={activeFingerTip.y}
                                r="12"
                                fill="none"
                                stroke={activeFinger?.color || '#6366f1'}
                                strokeWidth="2"
                                className="animate-ping"
                              />
                              <circle
                                cx={activeFingerTip.x}
                                cy={activeFingerTip.y}
                                r="6"
                                fill={activeFinger?.color || '#6366f1'}
                                className="animate-pulse"
                              />
                            </>
                          )}
                        </svg>
                      </div>
                    )}

                    {/* Keyboard Keycaps Rows */}
                    {rows.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1">
                        {row.map((k) => {
                          const isActive = targetKey === k.code;
                          const fingerColor = activeFinger?.color || '#6366f1';
                          
                          let baseClass = "h-7 sm:h-9 rounded-md flex flex-col items-center justify-center text-[10px] sm:text-xs font-semibold border transition-all duration-300 select-none ";
                          let activeClass = "";

                          if (isActive) {
                            if (k.code === 'space') {
                              activeClass = "bg-blue-500 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-[0.96] ring-2 ring-blue-400/40";
                            } else if (fingerColor === '#f43f5e') {
                              activeClass = "bg-rose-500 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] scale-[0.96] ring-2 ring-rose-400/40";
                            } else if (fingerColor === '#f59e0b') {
                              activeClass = "bg-amber-500 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-[0.96] ring-2 ring-amber-400/40";
                            } else if (fingerColor === '#eab308') {
                              activeClass = "bg-yellow-500 border-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.6)] scale-[0.96] ring-2 ring-yellow-400/40";
                            } else {
                              activeClass = "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-[0.96] ring-2 ring-emerald-400/40";
                            }
                          } else {
                            baseClass += getFingerZoneColor(k.code);
                          }

                          return (
                            <div
                              key={k.code}
                              data-key={k.code}
                              className={`${k.width} ${baseClass} ${activeClass}`}
                            >
                              <span>{k.label}</span>
                              {k.shift && (
                                <span className="text-[8px] opacity-40 -mt-0.5">{k.shift}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Home Row Details Cards */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Safka Dhexe (Home Row Positioning):
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Hand Card */}
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/20">
                    <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wide mb-3">
                      Gacanta Bidix (Left Hand)
                    </h4>
                    <ul className="flex flex-col gap-2.5 text-xs">
                      <li className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Farta Yariisada (Pinky)</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">A</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Farta Gurey (Ring)</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">S</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Farta Dhexe (Middle)</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold border border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">D</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Farta Murugta (Index)</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">F</span>
                      </li>
                    </ul>
                  </div>

                  {/* Right Hand Card */}
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/20">
                    <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wide mb-3">
                      Gacanta Midig (Right Hand)
                    </h4>
                    <ul className="flex flex-col gap-2.5 text-xs">
                      <li className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Farta Murugta (Index)</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">J</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Farta Dhexe (Middle)</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold border border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">K</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Farta Gurey (Ring)</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">L</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Farta Yariisada (Pinky)</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">;</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Zone Legend */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Midabada Finger Map (Kiiboodhka):
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold">
                  <div className="p-2 border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-450 rounded-xl text-center">
                    Rose: Pinky Finger
                  </div>
                  <div className="p-2 border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-450 rounded-xl text-center">
                    Amber: Ring Finger
                  </div>
                  <div className="p-2 border border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-450 rounded-xl text-center">
                    Yellow: Middle Finger
                  </div>
                  <div className="p-2 border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-450 rounded-xl text-center">
                    Emerald: Index Finger
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TYPING TIPS */}
          {activeTab === 'tips' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-900/10 hover:border-indigo-500/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                    Fadhiga Saxda ah (Posture)
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Dhabarka toosi adigoo wax qoraya, suxulladuna ha u foorareen 90 digrii. Indhahaagu ha toosnaadeen heerka sare ee shaashadda.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-900/10 hover:border-indigo-500/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                    Ha eegin Gacmahaaga (No Keyboard Peeking)
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    U ogolow maskaxdaada iyo muruqyada farahaaga inay xusuustaan booska xaraf kasta. Haddii aad u baahato caawinaad, eeg kiiboodhka dalwaddii (Virtual Keyboard) ee shaashadda ku yaal.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-900/10 hover:border-indigo-500/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                    Saxnaanta ayaa ka Horeysa Xawaaraha
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Waa muhiim inaad si sax ah u qorto kelmadaha. Haddii aad qalad samayso, xawaaruhu hoos ayuu u dhacayaa. Markaad saxnaanta hesho, xawaarahaagu si dabiici ah ayuu u kordhi doonaa!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HOW APP WORKS */}
          {activeTab === 'works' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-2">
                Hannaanka Casharada iyo Ciyaaraha:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">Casharada (120 Levels)</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Baro cashar kasta oo ku tababaraya xarfo gaar ah ee afka Soomaaliga.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">Ciyaaraha Checkpoint</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      15 cashar kasta kadib, waa inaad baastaa ciyaar Typing ah si aad u furto casharada xiga.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">Kasbo XP & Darajo</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Cashar kasta oo aad guulaysato iyo ciyaar kasta waxaad ku kasbaysaa dhibco XP ah oo kor u qaadaya heerkaga darajo.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">Fura Ciyaaraha Cusub</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Ciyaaraha waxay leeyihiin shuruud furitaan: EreyRoob (Heer 16), Flappy Type (Heer 31), WaqtigaDhow (Heer 46), iyo Baabuurta (Heer 61).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] cursor-pointer text-sm"
          >
            <Check className="w-4 h-4" />
            <span>Fahmay, aan bilaabo!</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardGuideModal;
