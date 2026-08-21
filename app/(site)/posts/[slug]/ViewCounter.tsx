interface ViewCounterProps {
  count: number;
}

export default function ViewCounter({ count }: ViewCounterProps) {
  return <div>{count} views</div>;
}
