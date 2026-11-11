export default function Button({ variant = 'primary', className = '', ...props }) {
  return <button className={`btn${variant === 'light' ? ' btn-light' : ''} ${className}`} {...props} />;
}