"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "./utils";

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  variant?: 'default' | 'purple';
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  variant = 'default',
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  // variant별 스타일 정의
  const trackClassName = variant === 'purple'
    ? "relative grow overflow-hidden rounded-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
    : "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-4 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5";

  const trackStyle = variant === 'purple'
    ? {
        background: 'linear-gradient(to right, rgb(168, 85, 247), rgb(147, 51, 234))',
        height: '12px'
      }
    : undefined;

  const rangeClassName = variant === 'purple'
    ? "absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
    : "bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full";

  const rangeStyle = variant === 'purple'
    ? {
        background: 'linear-gradient(to right, rgb(126, 34, 206), rgb(107, 33, 168))'
      }
    : undefined;

  const thumbClassName = variant === 'purple'
    ? "block w-6 h-6 shrink-0 rounded-full shadow-lg transition-shadow hover:shadow-xl focus-visible:shadow-xl focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
    : "border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50";

  const thumbStyle = variant === 'purple'
    ? {
        background: 'white',
        border: '4px solid rgb(168, 85, 247)',
        position: 'relative' as const,
        zIndex: 50
      }
    : undefined;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(trackClassName)}
        style={trackStyle}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(rangeClassName)}
          style={rangeStyle}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={thumbClassName}
          style={thumbStyle}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
