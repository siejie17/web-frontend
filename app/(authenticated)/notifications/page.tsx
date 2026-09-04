"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

import { BackButton } from "@/components/ui/BackButton";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  read_at?: string | null;
  created_at?: string;
};

type CategoryMeta = {
  icon: typeof Bell;
  tint: string;
  tintSoft: string;
  gradient: string;
  label: string;
};

const CATEGORY_RULES: Array<{ test: RegExp; meta: CategoryMeta }> = [
  {
    test: /overdue|urgent|reject|fail|expir|risk/i,
    meta: {
      icon: AlertTriangle,
      tint: "#B5533C",
      tintSoft: "#B5533C14",
      gradient: "linear-gradient(135deg, #C2664D, #B5533C)",
      label: "Attention",
    },
  },
  {
    test: /approv|complete|verified|passed|certif|publish/i,
    meta: {
      icon: CheckCircle2,
      tint: "#3E6B52",
      tintSoft: "#3E6B5214",
      gradient: "linear-gradient(135deg, #4C7E61, #3E6B52)",
      label: "Approval",
    },
  },
  {
    test: /cost|budget|estimate|price|invoice|proforma/i,
    meta: {
      icon: TrendingUp,
      tint: "#B4802E",
      tintSoft: "#B4802E14",
      gradient: "linear-gradient(135deg, #C6953F, #B4802E)",
      label: "Cost",
    },
  },
  {
    test: /team|invite|assign|member|collaborat|shared/i,
    meta: {
      icon: Users,
      tint: "#51707C",
      tintSoft: "#51707C14",
      gradient: "linear-gradient(135deg, #628390, #51707C)",
      label: "Team",
    },
  },
];

const DEFAULT_CATEGORY: CategoryMeta = {
  icon: Bell,
  tint: "#5E7A68",
  tintSoft: "#5E7A6814",
  gradient: "linear-gradient(135deg, #6E8C79, #5E7A68)",
  label: "Update",
};

function getCategory(item: NotificationItem): CategoryMeta {
  const text = `${item.title} ${item.message}`;
  const match = CATEGORY_RULES.find((rule) => rule.test.test(text));
  return match ? match.meta : DEFAULT_CATEGORY;
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return "Just now";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

function dayBucket(dateStr?: string): string {
  if (!dateStr) return "Today";
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(new Date(dateStr))) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  return "Earlier";
}

const BUCKET_ORDER = ["Today", "Yesterday", "This week", "Earlier"];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/be-api/notifications?limit=50", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setNotifications([]);
        return;
      }

      const data = await response.json().catch(() => ({ data: [] }));
      const list = Array.isArray(data?.data) ? data.data : [];
      setNotifications(list as NotificationItem[]);
      if (!selectedId && list.length > 0) {
        setSelectedId(String(list[0].id));
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const selectedNotification = useMemo(
    () => notifications.find((notification) => String(notification.id) === selectedId) ?? notifications[0] ?? null,
    [notifications, selectedId],
  );

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const filteredNotifications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((item) => {
      if (filter === "unread" && item.read_at) return false;
      if (!q) return true;
      return `${item.title} ${item.message}`.toLowerCase().includes(q);
    });
  }, [notifications, query, filter]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, NotificationItem[]>();
    for (const item of filteredNotifications) {
      const bucket = dayBucket(item.created_at);
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket)!.push(item);
    }
    return BUCKET_ORDER.filter((bucket) => groups.has(bucket)).map((bucket) => ({
      bucket,
      items: groups.get(bucket)!,
    }));
  }, [filteredNotifications]);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const response = await fetch("/be-api/notifications/read-all", {
        method: "PATCH",
        credentials: "include",
      });

      if (response.ok) {
        setNotifications((current) =>
          current.map((notification) => ({
            ...notification,
            read_at: new Date().toISOString(),
          })),
        );
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await fetch(`/be-api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      setNotifications((current) =>
        current.map((notification) =>
          String(notification.id) === notificationId
            ? { ...notification, read_at: new Date().toISOString() }
            : notification,
        ),
      );
    } catch {
      // no-op
    }
  };

  return (
    <div className="mx-auto max-w-[1040px] space-y-6 py-8">
      <BackButton />

      <div className="flex items-end justify-between gap-3 rounded-[28px] border border-[#E4E1D8] bg-white/85 p-6 shadow-[0_14px_38px_rgba(30,38,33,0.06)] sm:p-7">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C8880]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Notifications
          </p>
          <h1
            className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#1E2621]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your updates
          </h1>
          <p className="mt-1.5 text-[13px] text-[#6F7C73]">
            Approvals, cost changes, and team activity across your projects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={markingAll || unreadCount === 0}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#DDE5DF] bg-white px-4 py-2.5 text-[12px] font-semibold text-[#3E6B52] shadow-[0_1px_0_rgba(30,38,33,0.03)] transition-colors hover:border-[#C9D3CC] hover:bg-[#F6F8F7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck size={14} />
          {markingAll ? "Updating…" : "Mark all as read"}
        </button>
      </div>

      <div className="grid overflow-hidden rounded-[28px] border border-[#E4E1D8] bg-white/70 shadow-[0_20px_50px_rgba(30,38,33,0.07)] backdrop-blur-xl lg:grid-cols-[0.42fr_0.58fr] lg:divide-x lg:divide-[#E9E7DF]">
        {/* Left: notifications listing */}
        <div className="flex flex-col p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between px-1 pt-1">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7C8880]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Inbox
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#3E6B52]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3E6B52]">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="relative mb-3 px-1">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA39D]" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notifications"
              className="w-full rounded-full border border-transparent bg-[#F2F2ED] py-2.5 pl-9 pr-4 text-[12.5px] text-[#1E2621] placeholder:text-[#9AA39D] transition-colors focus:border-[#BFD6C8] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mb-4 flex items-center gap-1.5 px-1">
            {(["all", "unread"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`relative rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                  filter === tab ? "text-white" : "text-[#6F7C73] hover:text-[#1E2621]"
                }`}
              >
                {filter === tab && (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 rounded-full bg-[#3E6B52]"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 capitalize">
                  {tab === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
                </span>
              </button>
            ))}
          </div>

          <div className="max-h-[520px] flex-1 space-y-4 overflow-y-auto px-1 pb-1 pr-1 scrollbar-thin scrollbar-thumb-[#CBD7CD] scrollbar-track-transparent">
            {loading ? (
              <div className="space-y-2 px-1 py-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-2xl bg-[#F1F0EA]" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E6B52]/8 text-[#3E6B52]">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1E2621]">You&apos;re all caught up</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#8A938C]">
                    Approvals, comments, and cost alerts will show up here.
                  </p>
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-6 py-14 text-center text-[12.5px] text-[#8A938C]">
                Nothing matches &ldquo;{query}&rdquo;.
              </div>
            ) : (
              groupedNotifications.map(({ bucket, items }) => (
                <div key={bucket}>
                  <p
                    className="mb-2 px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#A7B0A9]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {bucket}
                  </p>
                  <div className="space-y-1">
                    <AnimatePresence initial={false}>
                      {items.map((notification) => {
                        const isSelected = String(notification.id) === String(selectedNotification?.id ?? "");
                        const isUnread = !notification.read_at;
                        const category = getCategory(notification);
                        const CategoryIcon = category.icon;

                        return (
                          <motion.button
                            key={notification.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            type="button"
                            onClick={async () => {
                              setSelectedId(String(notification.id));
                              if (isUnread) {
                                await markNotificationRead(String(notification.id));
                              }
                            }}
                            className="relative block w-full rounded-2xl px-3 py-3 text-left"
                          >
                            {isSelected && (
                              <motion.span
                                layoutId="notif-highlight"
                                className="absolute inset-0 rounded-2xl bg-white shadow-[0_8px_20px_rgba(30,38,33,0.06)] ring-1 ring-[#E4E1D8]"
                                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                              />
                            )}
                            <span
                              className="absolute inset-y-3 left-0 w-[3px] rounded-full transition-opacity"
                              style={{ backgroundColor: category.tint, opacity: isSelected ? 1 : 0 }}
                            />
                            <div className="relative flex items-start gap-3">
                              <div
                                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                style={{ backgroundImage: category.gradient }}
                              >
                                <CategoryIcon size={14} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className={`truncate text-[12.5px] ${
                                      isUnread ? "font-semibold text-[#1E2621]" : "font-medium text-[#3F4842]"
                                    }`}
                                  >
                                    {notification.title}
                                  </p>
                                  {isUnread && (
                                    <span className="relative mt-1.5 h-1.5 w-1.5 shrink-0">
                                      <span className="absolute inset-0 animate-ping rounded-full bg-[#3E6B52] opacity-60" />
                                      <span className="absolute inset-0 rounded-full bg-[#3E6B52]" />
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 line-clamp-1 text-[11.5px] leading-5 text-[#5B655F]">
                                  {notification.message}
                                </p>
                                <span className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-[#8A938C]">
                                  <Clock3 size={10.5} />
                                  {formatRelative(notification.created_at)}
                                </span>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: selected notification details */}
        <div className="relative p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {selectedNotification ? (
              (() => {
                const category = getCategory(selectedNotification);
                const CategoryIcon = category.icon;
                const reference = String(selectedNotification.id).slice(-6).toUpperCase().padStart(6, "0");

                return (
                  <motion.div
                    key={selectedNotification.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                        style={{ backgroundColor: category.tintSoft, color: category.tint }}
                      >
                        <CategoryIcon size={12} />
                        {category.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {!selectedNotification.read_at && (
                          <span className="rounded-full bg-[#3E6B52]/10 px-2.5 py-1 text-[10px] font-semibold text-[#3E6B52]">
                            Unread
                          </span>
                        )}
                        <span
                          className="text-[10.5px] text-[#B4B9B3]"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          No. {reference}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-start gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_6px_16px_rgba(30,38,33,0.12)]"
                        style={{ backgroundImage: category.gradient }}
                      >
                        <CategoryIcon size={19} />
                      </div>
                      <div className="min-w-0">
                        <h2
                          className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-[#1E2621]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {selectedNotification.title}
                        </h2>
                        {selectedNotification.created_at && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-[#8A938C]">
                            <Clock3 size={12} />
                            {new Date(selectedNotification.created_at).toLocaleString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="relative mt-6 overflow-hidden rounded-2xl border p-5"
                      style={{
                        borderColor: `${category.tint}30`,
                        backgroundImage: `linear-gradient(180deg, ${category.tintSoft}, transparent 60%)`,
                      }}
                    >
                      <p className="text-[15px] leading-7 text-[#1E2621]">{selectedNotification.message}</p>
                    </div>

                    {selectedNotification.link && (
                      <a
                        href={selectedNotification.link}
                        className="group mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(30,38,33,0.14)] transition-transform hover:-translate-y-0.5"
                        style={{ backgroundImage: category.gradient }}
                      >
                        Open related page
                        <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                      </a>
                    )}
                  </motion.div>
                );
              })()
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center gap-3 py-14 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E6B52]/8 text-[#3E6B52]">
                  <Bell size={20} />
                </div>
                <p className="text-[13px] text-[#6F7C73]">Select a notification to view its details.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}