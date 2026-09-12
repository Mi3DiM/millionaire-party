import {
  BoltBoldDuotone,
  CheckCircleBoldDuotone,
  ClockCircleBoldDuotone,
  CloseCircleBoldDuotone,
  CopyBoldDuotone,
  CrownBoldDuotone,
  CupStarBoldDuotone,
  EyeBoldDuotone,
  FlagBoldDuotone,
  GamepadBoldDuotone,
  LinkBoldDuotone,
  LockBoldDuotone,
  MedalRibbonBoldDuotone,
  MedalRibbonsStarBoldDuotone,
  MoonBoldDuotone,
  PieChartBoldDuotone,
  PlayBoldDuotone,
  QRCodeBoldDuotone,
  QuestionCircleBoldDuotone,
  RestartBoldDuotone,
  ShieldCheckBoldDuotone,
  SunBoldDuotone,
  UploadBoldDuotone,
  UsersGroupRoundedBoldDuotone,
  FireBoldDuotone,
} from "solar-icon-set";
import { cn } from "@/lib/utils";

// Single Solar family across the whole product: Bold Duotone.
const ICONS = {
  bolt: BoltBoldDuotone,
  check: CheckCircleBoldDuotone,
  clock: ClockCircleBoldDuotone,
  close: CloseCircleBoldDuotone,
  copy: CopyBoldDuotone,
  crown: CrownBoldDuotone,
  cup: CupStarBoldDuotone,
  eye: EyeBoldDuotone,
  flag: FlagBoldDuotone,
  fire: FireBoldDuotone,
  gamepad: GamepadBoldDuotone,
  link: LinkBoldDuotone,
  lock: LockBoldDuotone,
  medal: MedalRibbonBoldDuotone,
  medalStar: MedalRibbonsStarBoldDuotone,
  moon: MoonBoldDuotone,
  pie: PieChartBoldDuotone,
  play: PlayBoldDuotone,
  qr: QRCodeBoldDuotone,
  question: QuestionCircleBoldDuotone,
  restart: RestartBoldDuotone,
  shield: ShieldCheckBoldDuotone,
  sun: SunBoldDuotone,
  upload: UploadBoldDuotone,
  users: UsersGroupRoundedBoldDuotone,
} as const;

export type GameIconName = keyof typeof ICONS;

export function GameIcon({
  name,
  size = 20,
  className,
}: {
  name: GameIconName;
  size?: number | string;
  className?: string;
}) {
  const Cmp = ICONS[name];
  return <Cmp size={size} className={cn("shrink-0", className)} aria-hidden />;
}
