import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Lock, Check } from 'lucide-react';
import charGirlReading from '@/assets/char-girl-reading.png';
import charBoyPraying from '@/assets/char-boy-praying.png';
import charBoyChapelet from '@/assets/char-boy-chapelet.png';
import charGirlPraying from '@/assets/char-girl-praying.png';
import charGirlDua from '@/assets/char-girl-dua.png';
import charBoyReading from '@/assets/char-boy-reading.png';
import charGirlLantern from '@/assets/char-girl-lantern.png';
import charBoySalaam from '@/assets/char-boy-salaam.png';

const CHARACTER_IMAGES = [
  { src: charGirlReading, alt: 'Fille lisant le Coran' },
  { src: charBoyPraying, alt: 'Garçon en prière' },
  { src: charGirlDua, alt: 'Fille faisant dua' },
  { src: charBoyChapelet, alt: 'Garçon avec chapelet' },
  { src: charGirlLantern, alt: 'Fille avec lanterne' },
  { src: charBoyReading, alt: 'Garçon lisant le Coran' },
  { src: charGirlPraying, alt: 'Fille en prière' },
  { src: charBoySalaam, alt: 'Garçon qui salue' },
];

// Layout constants
const TOTAL_WIDTH = 320;
const LEFT_X = 52;
const CENTER_X = 160;
const RIGHT_X = 268;
const ROW_HEIGHT = 115;
const TOP_OFFSET = 50;
const ITEMS_PER_ROW = 3;
const CURVE_BULGE = 42;
const STAR_SIZE = 58;
const RIBBON_WIDTH = 13;
const CHARACTER_EVERY_N_TURNS = 3; // show a character every N U-turns

// Gift sourates: Al-Fil (105) then every 5 sourates
const GIFT_SOURATE_NUMBERS = new Set([105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5]);

interface SouratePathViewProps {
  sourates: Array<{
    number: number;
    name_arabic: string;
    name_french: string;
    verses_count: number;
    revelation_type: string;
  }>;
  dbSourates: Map<number, string>;
  sourateProgress: Map<string, { is_validated: boolean; is_memorized: boolean; progress_percentage: number }>;
  isSourateAccessible: (num: number) => boolean;
  onSourateClick: (sourate: any) => void;
}

const SouratePathView = ({
  sourates,
  dbSourates,
  sourateProgress,
  isSourateAccessible,
  onSourateClick,
}: SouratePathViewProps) => {
  const currentRef = useRef<HTMLDivElement>(null);

  const getNodeState = (sourateNum: number) => {
    const dbId = dbSourates.get(sourateNum);
    const progress = dbId ? sourateProgress.get(dbId) : undefined;
    const accessible = isSourateAccessible(sourateNum);
    const isValidated = !!progress?.is_validated;
    return { isValidated, accessible };
  };

  // Node positions
  const nodes = useMemo(() => {
    return sourates.map((sourate, i) => {
      const row = Math.floor(i / ITEMS_PER_ROW);
      const col = i % ITEMS_PER_ROW;
      const isLTR = row % 2 === 0;
      const xArr = [LEFT_X, CENTER_X, RIGHT_X];
      const x = isLTR ? xArr[col] : xArr[2 - col];
      const y = TOP_OFFSET + row * ROW_HEIGHT;
      return { x, y, sourate, index: i };
    });
  }, [sourates]);

  // SVG path segments
  const segments = useMemo(() => {
    const segs: { d: string; toIndex: number }[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];
      const fromRow = Math.floor(i / ITEMS_PER_ROW);
      const toRow = Math.floor((i + 1) / ITEMS_PER_ROW);

      let d: string;
      if (fromRow === toRow) {
        d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
      } else {
        // U-turn
        const isRightTurn = fromRow % 2 === 0;
        const bulgeX = isRightTurn ? RIGHT_X + CURVE_BULGE : LEFT_X - CURVE_BULGE;
        d = `M ${from.x} ${from.y} C ${bulgeX} ${from.y + ROW_HEIGHT * 0.4}, ${bulgeX} ${to.y - ROW_HEIGHT * 0.4}, ${to.x} ${to.y}`;
      }
      segs.push({ d, toIndex: i + 1 });
    }
    return segs;
  }, [nodes]);

  // Current (first accessible, non-validated)
  const currentIndex = useMemo(() => {
    for (let i = 0; i < sourates.length; i++) {
      const { isValidated, accessible } = getNodeState(sourates[i].number);
      if (accessible && !isValidated) return i;
    }
    return 0;
  }, [sourates, dbSourates, sourateProgress, isSourateAccessible]);

  // Auto-scroll to current
  useEffect(() => {
    const timer = setTimeout(() => {
      currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const totalRows = Math.ceil(sourates.length / ITEMS_PER_ROW);
  const totalHeight = TOP_OFFSET + totalRows * ROW_HEIGHT + 60;

  // Characters in U-turn hollows
  const characters = useMemo(() => {
    const chars: { x: number; y: number; img: typeof CHARACTER_IMAGES[0] }[] = [];
    let charIdx = 0;
    for (let row = 0; row < totalRows - 1; row++) {
      if (row % CHARACTER_EVERY_N_TURNS !== CHARACTER_EVERY_N_TURNS - 1) continue;
      const isRightTurn = row % 2 === 0;
      // Character sits in the OPPOSITE side of the curve (the hollow)
      const x = isRightTurn ? 8 : TOTAL_WIDTH - 56;
      const y = TOP_OFFSET + row * ROW_HEIGHT + ROW_HEIGHT * 0.5;
      chars.push({ x, y, img: CHARACTER_IMAGES[charIdx % CHARACTER_IMAGES.length] });
      charIdx++;
    }
    return chars;
  }, [totalRows]);

  const getSegmentColor = (toIndex: number) => {
    const { isValidated, accessible } = getNodeState(sourates[toIndex].number);
    if (isValidated) return 'hsl(142, 70%, 45%)';
    if (accessible) return 'hsl(40, 80%, 55%)';
    return 'hsl(220, 10%, 85%)';
  };

  const getStarFill = (isValidated: boolean, accessible: boolean) => {
    if (isValidated) return 'hsl(142, 70%, 45%)';
    if (accessible) return 'hsl(40, 80%, 55%)';
    return 'hsl(220, 10%, 85%)';
  };

  const getStarStroke = (isValidated: boolean, accessible: boolean, isCurrent: boolean) => {
    if (isValidated) return 'hsl(35, 80%, 50%)';
    if (isCurrent) return 'hsl(35, 90%, 55%)';
    if (accessible) return 'hsl(35, 70%, 60%)';
    return 'hsl(220, 10%, 75%)';
  };

  return (
    <div className="relative w-full flex justify-center overflow-x-hidden">
      {/* Glow animation style */}
      <style>{`
        @keyframes star-glow {
          0%, 100% { filter: drop-shadow(0 0 4px hsl(40, 80%, 55%)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 12px hsl(40, 90%, 60%)); transform: scale(1.06); }
        }
        .star-current { animation: star-glow 2s ease-in-out infinite; }
      `}</style>

      <div className="relative" style={{ width: TOTAL_WIDTH, minHeight: totalHeight }}>
        {/* SVG layer: ribbon + decorations */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={TOTAL_WIDTH}
          height={totalHeight}
          viewBox={`0 0 ${TOTAL_WIDTH} ${totalHeight}`}
          fill="none"
        >
          {/* Ribbon shadow layer */}
          {segments.map((seg, i) => (
            <path
              key={`shadow-${i}`}
              d={seg.d}
              stroke="hsl(0, 0%, 0%)"
              strokeWidth={RIBBON_WIDTH + 3}
              strokeLinecap="round"
              fill="none"
              opacity={0.06}
            />
          ))}
          {/* Ribbon main */}
          {segments.map((seg, i) => (
            <path
              key={`ribbon-${i}`}
              d={seg.d}
              stroke={getSegmentColor(seg.toIndex)}
              strokeWidth={RIBBON_WIDTH}
              strokeLinecap="round"
              fill="none"
              opacity={0.55}
            />
          ))}
        </svg>

        {/* Characters */}
        {characters.map((char, i) => (
          <div
            key={`char-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: char.x,
              top: char.y - 24,
              width: 48,
              height: 48,
            }}
          >
            <img
              src={char.img.src}
              alt={char.img.alt}
              className="w-full h-full object-contain opacity-90"
            />
          </div>
        ))}

        {/* Star nodes */}
        {nodes.map((node, i) => {
          const { isValidated, accessible } = getNodeState(node.sourate.number);
          const isCurrent = i === currentIndex;
          const isGift = GIFT_SOURATE_NUMBERS.has(node.sourate.number);

          return (
            <div
              key={node.sourate.number}
              ref={isCurrent ? currentRef : undefined}
              className="absolute flex flex-col items-center"
              style={{
                left: node.x - STAR_SIZE / 2,
                top: node.y - STAR_SIZE / 2,
                width: STAR_SIZE,
              }}
            >
              {/* Gift badge */}
              {isGift && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="text-lg leading-none drop-shadow-sm">🎁</span>
                </div>
              )}

              {/* Star button */}
              <button
                onClick={() => onSourateClick(node.sourate)}
                disabled={!accessible}
                className={cn(
                  'relative flex items-center justify-center transition-transform duration-200',
                  accessible && !isValidated && 'hover:scale-110',
                  isCurrent && 'star-current',
                  !accessible && 'cursor-not-allowed'
                )}
                style={{ width: STAR_SIZE, height: STAR_SIZE }}
              >
                <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-md">
                  <path
                    d="M24 2 L29.5 17.5 L46 17.5 L33 27.5 L37.5 44 L24 34 L10.5 44 L15 27.5 L2 17.5 L18.5 17.5 Z"
                    fill={getStarFill(isValidated, accessible)}
                    stroke={getStarStroke(isValidated, accessible, isCurrent)}
                    strokeWidth={isValidated || isCurrent ? 3 : 1.5}
                  />
                </svg>

                {/* Star content */}
                <span className={cn(
                  'absolute inset-0 flex items-center justify-center font-bold leading-none pt-0.5',
                  isValidated ? 'text-white' : accessible ? 'text-white text-[11px]' : 'text-gray-400'
                )}>
                  {isValidated ? (
                    <Check className="w-5 h-5" strokeWidth={3} />
                  ) : !accessible ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : node.sourate.number === 1000 ? (
                    <span className="text-[10px]">📖</span>
                  ) : (
                    node.sourate.number
                  )}
                </span>
              </button>

              {/* Sourate name */}
              <span className="text-[7px] text-muted-foreground text-center leading-tight mt-0.5 w-16 truncate">
                {node.sourate.name_french}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SouratePathView;
