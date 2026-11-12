const PATHS = {
  home: 'M4 11l8-7 8 7 M6 10v10h12V10 M10 20v-5h4v5',
  book: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h10',
  chat: 'M4 5h16v11H10l-4 4v-4H4z',
  steps: 'M4 19h4v-4h4v-4h4V7h4',
  clipboard: 'M9 4h6v3H9z M6 6h12v15H6z M9 14l2 2 4-4',
  pencil: 'M4 20l1-4L16 5l3 3L8 19z M14 7l3 3',
  chart: 'M5 20V11 M12 20V5 M19 20v-6',
  bulb: 'M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z M10 20h4',
  class: 'M3 9l9-5 9 5-9 5z M7 12v4c2 2 8 2 10 0v-4',
  topics: 'M5 5h5v5H5z M14 14h5v5h-5z M10 7h4a2 2 0 0 1 2 2v5',
  link: 'M9 15l6-6 M8 11l-2 2a3.5 3.5 0 0 0 5 5l2-2 M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 21h4',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M17 8a3 3 0 0 1 0 6 M21 20v-1a4 4 0 0 0-3-4',
};

export default function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}