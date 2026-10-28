export default function EmbroideredWordmark() {
  return <>
    <span className="wordmark-plain">Athenaeum.</span>
    <span className="embroidered-wordmark" aria-hidden="true">
      <img src={`${import.meta.env.BASE_URL}library/athenaeum-embroidered.png`} width="2172" height="724" alt="" />
    </span>
  </>;
}
