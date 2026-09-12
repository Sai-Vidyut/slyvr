import {
  createContext,
  useContext,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

type MouseEnterContextValue = [
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>,
  boolean,
];

const MouseEnterContext = createContext<MouseEnterContextValue | null>(null);

function useMouseEnterContext(): MouseEnterContextValue {
  const ctx = useContext(MouseEnterContext);
  if (!ctx) {
    throw new Error("CardItem must be used within CardContainer");
  }
  return ctx;
}

const TILT_DIVISOR = 56;
const TILT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

type CardContainerProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
};

export function CardContainer({
  children,
  className,
  containerClassName,
  disabled: disabledProp,
}: CardContainerProps) {
  const reducedMotion = useReducedMotion();
  const disabled = disabledProp ?? reducedMotion;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);

  const resetTilt = () => {
    if (!containerRef.current) return;
    containerRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / TILT_DIVISOR;
    const y = (e.clientY - top - height / 2) / TILT_DIVISOR;
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  };

  const handleMouseEnter = () => {
    if (!disabled) setIsMouseEntered(true);
  };

  const handleMouseLeave = () => {
    setIsMouseEntered(false);
    resetTilt();
  };

  return (
    <div
      className={cn(
        "w-full",
        !disabled && "[perspective:920px]",
        containerClassName,
      )}
    >
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "w-full [transform-style:preserve-3d]",
          !disabled && "will-change-transform",
          className,
        )}
        style={{
          transition: disabled ? undefined : `transform 260ms ${TILT_EASE}`,
        }}
      >
        <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered, disabled]}>
          {children}
        </MouseEnterContext.Provider>
      </div>
    </div>
  );
}

type CardBodyProps = {
  children: ReactNode;
  className?: string;
};

export function CardBody({ children, className }: CardBodyProps) {
  return (
    <div
      className={cn(
        "w-full [transform-style:preserve-3d] [&_*]:[transform-style:preserve-3d]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type CardItemProps<T extends ElementType = "div"> = {
  as?: T;
  children?: ReactNode;
  className?: string;
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  /** Slightly slower layer settle for readable text */
  layer?: "media" | "default";
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className" | "layer">;

export function CardItem<T extends ElementType = "div">({
  as,
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  layer = "default",
  style,
  ...rest
}: CardItemProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const [isMouseEntered, , disabled] = useMouseEnterContext();

  const transform =
    disabled || !isMouseEntered
      ? "translate3d(0, 0, 0)"
      : `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;

  const duration = layer === "media" ? "220ms" : "260ms";

  return (
    <Tag
      className={cn("transition-transform ease-out", className)}
      style={{
        transform,
        transitionDuration: disabled ? undefined : duration,
        transitionTimingFunction: disabled ? undefined : TILT_EASE,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
