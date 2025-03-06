"use client";

import React from 'react';
import { cn } from '@/app/lib/utils';

interface HamburgerIconProps {
  isOpen: boolean;
  className?: string;
}

export default function HamburgerIcon({ isOpen, className }: HamburgerIconProps) {
  return (
    <div className={cn('relative w-5 h-5 flex items-center justify-center', className)}>
      <div className={cn(
        'absolute w-full h-[2px] bg-foreground rounded-full transition-transform duration-300 ease-in-out',
        isOpen ? 'rotate-45' : '-translate-y-[5px]'
      )} />
      <div className={cn(
        'absolute w-full h-[2px] bg-foreground rounded-full transition-opacity duration-200',
        isOpen ? 'opacity-0' : 'opacity-100'
      )} />
      <div className={cn(
        'absolute w-full h-[2px] bg-foreground rounded-full transition-transform duration-300 ease-in-out',
        isOpen ? '-rotate-45' : 'translate-y-[5px]'
      )} />
    </div>
  );
} 