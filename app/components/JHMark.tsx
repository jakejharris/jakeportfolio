import { cn } from '../lib/utils';

// Jake's JH monogram, lifted from the JJH Digital vector logo
// (Pictures/jjhdigital/jjhdigital_logo_bw.svg). Fills with currentColor
// so it stays black-and-white across light/dark themes.
export default function JHMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="145 10 194 151"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={cn('h-6 w-auto', className)}
    >
      <path d="M253.1,13.1v86.1c0,24.9-5.5,35.6-14.3,44.8-10.1,10.5-21.7,15.8-38.2,15.8s-26.6-1.5-39.4-15.6c-11.3-12.7-13.9-22.9-14.3-39.8,0-1,.8-1.9,1.8-1.9h31.8c1,0,1.8.8,1.8,1.7.2,3.9.8,8.2,2.3,12.1h0s0,0,0,0c2.9,6.5,8,9.8,15.4,9.8s12.8-3,15.2-9c2.3-5.4,2.3-12.4,2.3-18V13.1c0-1,.8-1.8,1.8-1.8h31.8c1,0,1.8.8,1.8,1.9Z" />
      <path d="M256.5,69.3c0-1,.8-1.7,1.8-1.7s0,0,0,0h41.7c1,0,1.8-.8,1.8-1.9V13.1c0-1,.8-1.9,1.8-1.9h33.5c1,0,1.8.8,1.8,1.9v145.1c0,1-.8,1.9-1.8,1.9h-33.5c-1,0-1.8-.8-1.8-1.9v-54.6c0-1-.8-1.9-1.8-1.9h-41.7s0,0,0,0c-1,0-1.8-.7-1.8-1.7v-30.7Z" />
    </svg>
  );
}
