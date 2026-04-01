function IconBase({ children, className = '', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MenuGridIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}

export function SearchIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </IconBase>
  );
}

export function PhoneIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 4.5h3l1.2 4-1.8 1.8a15.6 15.6 0 0 0 5.3 5.3l1.8-1.8 4 1.2v3a2 2 0 0 1-2.2 2c-7.6-.8-13.5-6.7-14.3-14.3A2 2 0 0 1 6 4.5Z" />
    </IconBase>
  );
}

export function UserIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </IconBase>
  );
}

export function CartIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="M3 5h2l2.2 9.4A1 1 0 0 0 8.2 15H18a1 1 0 0 0 1-.8L20.4 8H6.2" />
    </IconBase>
  );
}

export function TruckIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h3.8l2.2 2.5V15H14z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </IconBase>
  );
}

export function ClipboardIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4.5h6v3H9z" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
    </IconBase>
  );
}

export function CalculatorIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 11h2" />
      <path d="M14 11h2" />
      <path d="M8 15h2" />
      <path d="M14 15h2" />
    </IconBase>
  );
}

export function QuestionIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 4.1 1.9c-.9.7-1.6 1.2-1.6 2.6" />
      <path d="M12 17h.01" />
    </IconBase>
  );
}

export function NewspaperIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 5h12v14H8a2 2 0 0 1-2-2V5Z" />
      <path d="M6 17a2 2 0 0 0 2 2" />
      <path d="M9 9h6" />
      <path d="M9 12h6" />
      <path d="M9 15h4" />
    </IconBase>
  );
}

export function GiftIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 10h16v10H4z" />
      <path d="M12 10v10" />
      <path d="M4 7h16v3H4z" />
      <path d="M12 7c-1.7 0-3-1.3-3-3 2 0 3 1 3 3Z" />
      <path d="M12 7c1.7 0 3-1.3 3-3-2 0-3 1-3 3Z" />
    </IconBase>
  );
}

export function BoxIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 12 20 7.5" />
      <path d="M12 12 4 7.5" />
      <path d="M12 12v9" />
    </IconBase>
  );
}

export function CubeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 2.8 20 7v10l-8 4.2L4 17V7l8-4.2Z" />
      <path d="M12 12.2 20 7" />
      <path d="M12 12.2 4 7" />
      <path d="M12 12.2v9" />
    </IconBase>
  );
}

export function TagIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 11.5V5a2 2 0 0 1 2-2h6.5L21 12.5 12.5 21 3 11.5Z" />
      <circle cx="8" cy="8" r="1.2" />
    </IconBase>
  );
}

export function HeartHandshakeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 11 5.6 8.6A3.2 3.2 0 0 1 10.1 4l1.9 1.9L13.9 4a3.2 3.2 0 1 1 4.5 4.5L16 11" />
      <path d="M7 14h4l1.7 1.6a1.8 1.8 0 0 0 2.6 0l3.2-3.1" />
      <path d="M3 14h3l2 4h3" />
    </IconBase>
  );
}

export function SparklesIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
      <path d="m19 14 .6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z" />
      <path d="m5 15 .8 2.4 2.4.8-2.4.8L5 21.4l-.8-2.4-2.4-.8 2.4-.8L5 15Z" />
    </IconBase>
  );
}

export function ChevronRightIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m9 6 6 6-6 6" />
    </IconBase>
  );
}
