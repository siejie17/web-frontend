export function getTimePeriod(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return "Morning";
  if (hour === 12) return "Noon";
  if (hour >= 13 && hour < 18) return "Afternoon";
  if (hour >= 18 && hour < 21) return "Evening";
  if (hour >= 21) return "Night";
  return "Midnight";
}

export function formatRelativeTime(timestamp) {
  const date = new Date(timestamp.replace(" ", "T"));
  const now = new Date();

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return "A day ago";
  }
  if (days < 7) {
    return `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks === 1) {
    return "A week ago";
  }
  if (weeks < 5) {
    return `${weeks} weeks ago`;
  }

  const months = Math.floor(days / 30);
  if (months === 1) {
    return "A month ago";
  }
  if (months < 12) {
    return `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  if (years === 1) {
    return "A year ago";
  }

  return `${years} years ago`;
}

export function formatCurrency(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return `RM ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatSize(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return `${n.toLocaleString("en-US")} m²`;
}