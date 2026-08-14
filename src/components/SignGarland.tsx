const BULBS = Array.from({ length: 7 }, (_, index) => index);

export default function SignGarland() {
  return (
    <span className="sign-garland" aria-hidden="true">
      {BULBS.map((bulb) => (
        <span key={bulb} className="garland-bulb" />
      ))}
    </span>
  );
}
