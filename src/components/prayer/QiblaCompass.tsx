import { useEffect, useState, useRef, useCallback } from 'react';
import { CityOption } from '@/hooks/usePrayerTimesCity';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QiblaCompassProps {
  city: CityOption;
  onClose: () => void;
}

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

const toRad = (deg: number) => deg * Math.PI / 180;
const toDeg = (rad: number) => rad * 180 / Math.PI;

function calcQiblaAngle(userLat: number, userLng: number): number {
  const dLng = toRad(KAABA_LNG - userLng);
  const userLatRad = toRad(userLat);
  const kaabaLatRad = toRad(KAABA_LAT);
  const y = Math.sin(dLng) * Math.cos(kaabaLatRad);
  const x = Math.cos(userLatRad) * Math.sin(kaabaLatRad) -
            Math.sin(userLatRad) * Math.cos(kaabaLatRad) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const QiblaCompass = ({ city, onClose }: QiblaCompassProps) => {
  const qiblaAngle = calcQiblaAngle(city.lat, city.lon);
  const [compassActive, setCompassActive] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const smoothHeadingRef = useRef(0);
  const targetHeadingRef = useRef(0);
  const animRef = useRef<number>();
  const handlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  // Create stable handler
  useEffect(() => {
    handlerRef.current = (e: DeviceOrientationEvent) => {
      const heading: number = (e as any).webkitCompassHeading ?? e.alpha ?? 0;
      targetHeadingRef.current = heading;
      setDeviceHeading(heading);
    };
  }, []);

  // Auto-start on non-iOS (no permission needed)
  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as any;
    if (typeof DOE?.requestPermission !== 'function' && window.DeviceOrientationEvent) {
      // Android / desktop — start immediately
      const handler = (e: DeviceOrientationEvent) => {
        const heading: number = (e as any).webkitCompassHeading ?? e.alpha ?? 0;
        targetHeadingRef.current = heading;
        setDeviceHeading(heading);
      };
      handlerRef.current = handler;
      window.addEventListener('deviceorientationabsolute', handler as EventListener, true);
      window.addEventListener('deviceorientation', handler as EventListener, true);
      setCompassActive(true);

      return () => {
        window.removeEventListener('deviceorientationabsolute', handler as EventListener, true);
        window.removeEventListener('deviceorientation', handler as EventListener, true);
      };
    }
  }, []);

  // Cleanup for iOS listener
  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        window.removeEventListener('deviceorientation', handlerRef.current as EventListener, true);
      }
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Synchronous onClick handler for iOS permission
  const handleActivateCompass = async () => {
    try {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          const handler = (e: DeviceOrientationEvent) => {
            const heading: number = (e as any).webkitCompassHeading ?? e.alpha ?? 0;
            targetHeadingRef.current = heading;
            setDeviceHeading(heading);
          };
          handlerRef.current = handler;
          window.addEventListener('deviceorientation', handler as EventListener, true);
          setCompassActive(true);
        } else {
          setCompassError("Permission refusée. Allez dans Réglages > Safari > Mouvement et orientation.");
        }
      } else {
        window.addEventListener('deviceorientation', handlerRef.current as EventListener, true);
        setCompassActive(true);
      }
    } catch {
      setCompassError("Erreur d'activation. Essayez de recharger la page.");
    }
  };

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      const target = targetHeadingRef.current;
      let current = smoothHeadingRef.current;
      let diff = target - current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      current += diff * 0.1;
      smoothHeadingRef.current = current;
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // Re-render at ~30fps
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 33);
    return () => clearInterval(interval);
  }, []);

  const currentHeading = smoothHeadingRef.current;
  const compassRotation = -currentHeading;
  const qiblaPointerRotation = qiblaAngle - currentHeading;

  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  const degMarkers = Array.from({ length: 72 }, (_, i) => i * 5);
  const cardinals = [
    { deg: 0, label: 'N' },
    { deg: 90, label: 'E' },
    { deg: 180, label: 'S' },
    { deg: 270, label: 'O' },
  ];

  // Check if iOS needs permission button
  const needsButton = !compassActive && typeof (window.DeviceOrientationEvent as any)?.requestPermission === 'function';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-md p-6 pb-8 space-y-4"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Direction Qibla</h3>
            <p className="text-sm text-muted-foreground">Qibla : {Math.round(qiblaAngle)}° depuis {city.label}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-muted hover:bg-muted/80">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Map */}
        <div className="rounded-xl overflow-hidden bg-blue-50 dark:bg-slate-800 relative" style={{ height: 140 }}>
          <svg viewBox="0 0 340 140" className="w-full h-full">
            <rect width="340" height="140" fill="#a8d8ea" />
            <path d="M 30 20 L 80 15 L 110 25 L 130 20 L 140 35 L 120 50 L 100 60 L 80 70 L 60 80 L 40 75 L 20 60 L 15 40 Z" fill="#c8d8a8" />
            <path d="M 50 80 L 100 75 L 130 90 L 140 120 L 110 140 L 70 140 L 40 130 L 35 100 Z" fill="#d4c5a0" />
            <path d="M 180 40 L 230 35 L 250 55 L 240 80 L 210 90 L 185 75 L 175 55 Z" fill="#d4c5a0" />
            <circle cx="215" cy="65" r="8" fill="#1a6b3a" opacity="0.9" />
            <text x="215" y="69" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">🕋</text>
            <circle cx="90" cy="35" r="5" fill="#1a6b3a" />
            <line x1="90" y1="35" x2="210" y2="60" stroke="#1a6b3a" strokeWidth="2" strokeDasharray="5 3" markerEnd="url(#arrow)" />
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 Z" fill="#1a6b3a" />
              </marker>
            </defs>
            <text x="90" y="28" textAnchor="middle" fill="#1a3a1a" fontSize="8" fontWeight="bold">{city.label}</text>
            <text x="225" y="58" fill="#1a3a1a" fontSize="7">La Mecque</text>
          </svg>
        </div>

        {/* iOS Permission Button */}
        {needsButton && (
          <div className="text-center space-y-2">
            <Button
              onClick={handleActivateCompass}
              className="bg-green-700 hover:bg-green-800 text-white gap-2"
            >
              🧭 Activer la boussole
            </Button>
            {compassError && (
              <p className="text-xs text-destructive">{compassError}</p>
            )}
            {!compassError && (
              <p className="text-xs text-muted-foreground">
                Autorisez l'accès à la boussole pour une orientation en temps réel
              </p>
            )}
          </div>
        )}

        {/* Compass */}
        <div className="flex items-center justify-center">
          <div className="relative" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              style={{ transform: `rotate(${compassRotation}deg)` }}
              className="absolute inset-0"
            >
              <circle cx={cx} cy={cy} r={r} fill="#1a6b3a" />
              <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke="#2d8a50" strokeWidth="1" />
              <circle cx={cx} cy={cy} r={r * 0.7} fill="#155e30" opacity="0.5" />
              <circle cx={cx} cy={cy} r={r * 0.5} fill="#1a6b3a" opacity="0.3" />

              {degMarkers.map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const isMajor = deg % 30 === 0;
                const innerR = isMajor ? r - 15 : r - 10;
                return (
                  <line
                    key={deg}
                    x1={cx + Math.sin(rad) * r}
                    y1={cy - Math.cos(rad) * r}
                    x2={cx + Math.sin(rad) * innerR}
                    y2={cy - Math.cos(rad) * innerR}
                    stroke={isMajor ? 'white' : 'rgba(255,255,255,0.4)'}
                    strokeWidth={isMajor ? 1.5 : 0.8}
                  />
                );
              })}

              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const textR = r - 25;
                const isCardinal = deg % 90 === 0;
                const label = cardinals.find(c => c.deg === deg)?.label ?? String(deg);
                return (
                  <text
                    key={deg}
                    x={cx + Math.sin(rad) * textR}
                    y={cy - Math.cos(rad) * textR + 4}
                    textAnchor="middle"
                    fill={isCardinal ? 'white' : 'rgba(255,255,255,0.7)'}
                    fontSize={isCardinal ? 16 : 9}
                    fontWeight={isCardinal ? 'bold' : 'normal'}
                  >
                    {label}
                  </text>
                );
              })}
            </svg>

            <svg width={size} height={size} className="absolute inset-0">
              <g transform={`rotate(${qiblaPointerRotation}, ${cx}, ${cy})`}>
                <polygon
                  points={`${cx},${cy - r + 30} ${cx - 6},${cy + 20} ${cx},${cy + 10} ${cx + 6},${cy + 20}`}
                  fill="white"
                  opacity="0.95"
                />
                <text x={cx} y={cy - r + 45} textAnchor="middle" fontSize="16">🕋</text>
              </g>
              <circle cx={cx} cy={cy} r="6" fill="#1e293b" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Info */}
        <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 text-center">
          <p className="text-sm text-green-800 dark:text-green-300">
            La Qibla est à <strong>{Math.round(qiblaAngle)}°</strong> depuis {city.label}
          </p>
          {compassActive && (
            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
              Cap actuel : {Math.round(deviceHeading)}° — Orientez le haut du téléphone vers 🕋
            </p>
          )}
          {!compassActive && !needsButton && (
            <p className="text-xs text-muted-foreground mt-1">
              Boussole non disponible sur cet appareil. Orientez-vous à <strong>{Math.round(qiblaAngle)}°</strong> depuis le Nord.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QiblaCompass;
