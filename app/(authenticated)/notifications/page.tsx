"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

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
  return new Date(dateStr).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function dayBucket(dateStr?: string): string {
  if (!dateStr) return "Today";
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(dateStr))) / 86400000,
  );
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
  // Below `lg` the two panes can't sit side by side, so we toggle which one
  // is visible. At `lg`+ this is ignored — both panes always show.
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

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
    () =>
      notifications.find(
        (notification) => String(notification.id) === selectedId,
      ) ??
      notifications[0] ??
      null,
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
    return BUCKET_ORDER.filter((bucket) => groups.has(bucket)).map(
      (bucket) => ({
        bucket,
        items: groups.get(bucket)!,
      }),
    );
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
    <div className="mx-auto space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8 md:max-w-375">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[#E4E1D8] bg-white/85 p-5 shadow-[0_14px_38px_rgba(30,38,33,0.06)] sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:p-6 lg:p-7">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C8880]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Notifications
          </p>
          <h1
            className="mt-2 text-[26px] font-bold tracking-[-0.03em] text-[#1E2621] sm:text-[30px]"
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
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#DDE5DF] bg-white px-4 py-3 text-[12px] font-semibold text-[#3E6B52] shadow-[0_1px_0_rgba(30,38,33,0.03)] transition-colors hover:border-[#C9D3CC] hover:bg-[#F6F8F7] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2.5"
        >
          <CheckCheck size={14} />
          {markingAll ? "Updating…" : "Mark all as read"}
        </button>
      </div>

      <div className="grid overflow-hidden h-144 rounded-[28px] border border-[#E4E1D8] bg-white/70 shadow-[0_20px_50px_rgba(30,38,33,0.07)] backdrop-blur-xl lg:grid-cols-[0.42fr_0.58fr] lg:divide-x lg:divide-[#E9E7DF]">
        {/* Left: notifications listing — hidden on mobile once a detail is open */}
        <div
          className={`${
            mobileView === "detail" ? "hidden" : "flex"
          } flex-col p-4 sm:p-5 lg:flex`}
        >
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
            <Search
              size={14}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA39D]"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notifications"
              className="w-full rounded-full border border-transparent bg-[#F2F2ED] py-3 pl-9 pr-4 text-[12.5px] text-[#1E2621] placeholder:text-[#9AA39D] transition-colors focus:border-[#BFD6C8] focus:bg-white focus:outline-none sm:py-2.5"
            />
          </div>

          <div className="mb-4 flex items-center gap-1.5 px-1">
            {(["all", "unread"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`relative rounded-full px-3.5 py-2 text-[11.5px] font-semibold transition-colors sm:py-1.5 ${
                  filter === tab
                    ? "text-white"
                    : "text-[#6F7C73] hover:text-[#1E2621]"
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
                  {tab === "all"
                    ? "All"
                    : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
                </span>
              </button>
            ))}
          </div>

          <div className="max-h-[65vh] flex-1 space-y-4 overflow-y-auto px-1 pb-1 pr-1 scrollbar-thin scrollbar-thumb-[#CBD7CD] scrollbar-track-transparent lg:max-h-[520px]">
            {loading ? (
              <div className="space-y-2 px-1 py-2">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-2xl bg-[#F1F0EA]"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E6B52]/8 text-[#3E6B52]">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1E2621]">
                    You&apos;re all caught up
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#8A938C]">
                    Approvals, comments, and cost alerts will show up here.
                  </p>
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-6 py-14 text-center text-[12.5px] text-[#8A938C]">
                No results found
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
                        const isSelected =
                          String(notification.id) ===
                          String(selectedNotification?.id ?? "");
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
                              setMobileView("detail");
                              if (isUnread) {
                                await markNotificationRead(
                                  String(notification.id),
                                );
                              }
                            }}
                            className={[
                              "group relative block w-full rounded-2xl px-3 py-3 text-left",
                              "transition-colors duration-150",
                              "motion-safe:active:scale-[0.985]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E6B52]/40",
                              !isSelected && "hover:bg-[#FBFAF6]",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {isSelected && (
                              <motion.span
                                layoutId="notif-highlight"
                                className="absolute inset-0 hidden rounded-2xl bg-white shadow-[0_6px_16px_rgba(30,38,33,0.07)] ring-1 lg:block"
                                style={{
                                  boxShadow: `0 6px 16px rgba(30,38,33,0.07), 0 0 0 1px ${category.tint}22`,
                                }}
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 38,
                                }}
                              />
                            )}

                            <span
                              className="absolute inset-y-3 left-0 hidden w-[3px] rounded-full transition-opacity duration-200 lg:block"
                              style={{
                                backgroundColor: category.tint,
                                opacity: isSelected ? 1 : 0,
                              }}
                            />

                            <div className="relative flex items-start gap-3">
                              <div
                                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-inset ring-white/15"
                                style={{ backgroundImage: category.gradient }}
                              >
                                <CategoryIcon size={15} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className={`truncate text-[12.5px] leading-5 ${
                                      isUnread
                                        ? "font-semibold text-[#1E2621]"
                                        : "font-medium text-[#3F4842]"
                                    }`}
                                  >
                                    {notification.title}
                                  </p>
                                  {isUnread && (
                                    <span className="relative mt-1.5 h-1.5 w-1.5 shrink-0">
                                      <span className="absolute inset-0 rounded-full bg-[#3E6B52] motion-safe:animate-[ping_0.9s_ease-out_1]" />
                                      <span className="absolute inset-0 rounded-full bg-[#3E6B52]" />
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 line-clamp-1 text-[11.5px] leading-5 text-[#5B655F]">
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

        {/* Right: selected notification details — the only pane shown on mobile once opened */}
        <div
          className={`${
            mobileView === "list" ? "hidden" : "block"
          } relative p-5 sm:p-6 lg:block lg:p-8`}
        >
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className="mb-5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3E6B52] lg:hidden"
          >
            <ChevronLeft size={15} />
            Back to inbox
          </button>

          <AnimatePresence mode="wait">
            {selectedNotification ? (
              (() => {
                const category = getCategory(selectedNotification);
                const CategoryIcon = category.icon;
                const reference = String(selectedNotification.id)
                  .slice(-6)
                  .toUpperCase()
                  .padStart(6, "0");

                return (
                  <motion.div
                    key={selectedNotification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="mx-auto"
                  >
                    {/* Top meta row */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset"
                        style={{
                          backgroundColor: category.tintSoft,
                          color: category.tint,
                          boxShadow: `inset 0 0 0 1px ${category.tint}22`,
                        }}
                      >
                        <CategoryIcon size={12} />
                        {category.label}
                      </span>
                      <span
                        className="text-[10.5px] tracking-wide text-[#B4B9B3]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        No. {reference}
                      </span>
                    </div>

                    {/* Icon + title block */}
                    <div className="mt-6 flex items-start gap-4">
                      <div
                        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white sm:h-14 sm:w-14"
                        style={{
                          backgroundImage: category.gradient,
                          boxShadow: `0 8px 20px -4px ${category.tint}55`,
                        }}
                      >
                        <CategoryIcon size={20} />
                        {!selectedNotification.read_at && (
                          <span
                            className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white"
                            style={{ backgroundColor: category.tint }}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2
                          className="text-[19px] font-bold leading-snug tracking-[-0.02em] text-[#1E2621] sm:text-[23px]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {selectedNotification.title}
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#8A938C]">
                          {selectedNotification.created_at && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 size={12} />
                              {new Date(selectedNotification.created_at).toLocaleString([], {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          {!selectedNotification.read_at && (
                            <span
                              className="inline-flex items-center gap-1 font-semibold"
                              style={{ color: category.tint }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: category.tint }}
                              />
                              Unread
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Message card */}
                    <div
                      className="relative mt-6 overflow-hidden rounded-[20px] border bg-white/60 p-5 sm:p-6"
                      style={{ borderColor: "#E9E7DF" }}
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundImage: category.gradient }}
                      />
                      <p className="pl-2 text-[14.5px] leading-7 text-[#374039] sm:text-[15px]">
                        {selectedNotification.message}
                      </p>
                    </div>

                    {/* CTA */}
                    {selectedNotification.link && (
                      <a
                        href={selectedNotification.link}
                        className="group mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[12.5px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg sm:py-3"
                        style={{
                          backgroundImage: category.gradient,
                          boxShadow: `0 10px 24px -6px ${category.tint}66`,
                        }}
                      >
                        Open related page
                        <ChevronRight
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
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
                className="flex h-full flex-col items-center justify-center gap-3 py-14 text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-[#D6DCD8] text-[#9AA39D]">
                  <Bell size={22} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#3F4842]">
                    Nothing selected
                  </p>
                  <p className="mt-1 max-w-[220px] text-[12px] leading-5 text-[#8A938C]">
                    Pick a notification from the inbox to see the details here.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
