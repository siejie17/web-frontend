"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Search, Check, UserPlus } from "lucide-react";
import type { User } from "@/lib/mockChat/types";
import { Avatar } from "./Avatar";
import { RoleBadge } from "./RoleBadge";
import type { ToastKind } from "./Toast";

export function AddMembersModal({
  isOpen,
  onClose,
  searchUsers,
  onAdd,
  onToast,
  memberIds = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  searchUsers: (query: string) => Promise<User[]>;
  onAdd: (userIds: string[]) => Promise<unknown>;
  onToast: (kind: ToastKind, message: string) => void;
  memberIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelected([]);
      setResults([]);
    }
  }, [isOpen]);

  const runSearch = useCallback(
    (q: string) => {
      const seq = ++searchSeq.current;
      setSearching(true);
      searchUsers(q)
        .then((r) => {
          if (seq === searchSeq.current) setResults(r);
        })
        .finally(() => {
          if (seq === searchSeq.current) setSearching(false);
        });
    },
    [searchUsers],
  );

  // On open, immediately list members by default (limit handled by endpoint);
  // typing a query switches it to a debounced search.
  useEffect(() => {
    if (isOpen) runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 350);
  };

  const toggle = (u: User) => {
    if (memberIds.includes(u.id)) return;
    setSelected((prev) =>
      prev.some((s) => s.id === u.id)
        ? prev.filter((s) => s.id !== u.id)
        : [...prev, u],
    );
  };

  const isSelected = (id: string) => selected.some((s) => s.id === id);

  const add = async () => {
    if (selected.length === 0 || adding) return;
    setAdding(true);
    try {
      await onAdd(selected.map((s) => s.id));
      onToast(
        "success",
        `${selected.length} member${selected.length === 1 ? "" : "s"} added to the project.`,
      );
      setSelected([]);
      setQuery("");
      setResults([]);
      onClose();
    } catch {
      onToast("error", "Could not add members. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-[#1E2621]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-[600px] max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_24px_60px_rgba(30,38,33,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EFEDE6] px-6 py-4">
          <div>
            <p
              className="text-[15px] font-semibold text-[#1E2621]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Add members
            </p>
            <p className="text-[12px] text-[#8A938C]">
              Search by name or email to invite team members.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#1E2621]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search input */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 rounded-2xl border border-[#E4E1D8] bg-[#FBFAF7] px-3.5 py-2.5 focus-within:border-[#BFD6C8] focus-within:ring-2 focus-within:ring-[#3E6B52]/10">
            <Search size={16} className="shrink-0 text-[#8A938C]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search users…"
              className="w-full bg-transparent text-[13.5px] text-[#1E2621] placeholder:text-[#A9B0AA] focus:outline-none"
            />
          </div>
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 px-6 pt-3">
            {selected.map((u) => (
              <span
                key={u.id}
                className="flex items-center gap-1.5 rounded-full border border-[#BFD6C8] bg-[#3E6B52]/5 py-1 pl-1.5 pr-2 text-[12px] font-medium text-[#2E5140]"
              >
                <Avatar name={u.fullName} size={18} src={u.avatar} />
                <span className="max-w-[140px] truncate">{u.fullName}</span>
                <button
                  type="button"
                  onClick={() => toggle(u)}
                  className="ml-0.5 rounded-full p-0.5 text-[#5B655F] transition-colors hover:bg-[#3E6B52]/10 hover:text-[#1E2621]"
                  aria-label={`Remove ${u.fullName}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {searching ? (
            <div className="space-y-1 px-3 py-1">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex w-full animate-pulse items-center gap-3 rounded-2xl px-3 py-2.5"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-[#EDEAE0]" />
                  <span className="min-w-0 flex-1">
                    <span className="block h-3 w-32 rounded-full bg-[#EDEAE0]" />
                    <span className="mt-1.5 block h-2.5 w-44 rounded-full bg-[#F1F0EA]" />
                  </span>
                  <span className="h-6 w-6 shrink-0 rounded-full bg-[#EFEDE6]" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-[13.5px] font-medium text-[#5B655F]">
                {query.trim()
                  ? "No users found."
                  : "Type a name or email to search."}
              </p>
            </div>
          ) : (
            results.map((u) => {
              const sel = isSelected(u.id);
              const alreadyAdded = memberIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u)}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                    sel ? "bg-[#3E6B52]/8" : "hover:bg-[#FBFAF7]"
                  }`}
                >
                  <Avatar name={u.fullName} size={36} src={u.avatar} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="max-w-[200px] truncate text-[13.5px] font-semibold text-[#1E2621]">
                        {u.fullName}
                      </span>
                      <RoleBadge role={u.role} />
                    </span>
                    <span className="block truncate text-[11.5px] text-[#8A938C]">
                      {u.email}
                    </span>
                  </span>
                  {alreadyAdded ? (
                    <span className="flex items-center gap-1 rounded-full bg-[#F1F0EA] px-2.5 py-1 text-[10.5px] font-semibold text-[#8A938C]">
                      <Check size={12} />
                      Added
                    </span>
                  ) : (
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        sel
                          ? "border-[#3E6B52] bg-[#3E6B52] text-white"
                          : "border-[#D4D9D4] text-transparent group-hover:border-[#BFD6C8]"
                      }`}
                    >
                      <Check size={13} />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#EFEDE6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E4E1D8] bg-[#FBFAF7] px-4 py-2 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#3E6B52]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={add}
            disabled={selected.length === 0 || adding}
            className="flex items-center gap-2 rounded-full bg-[#3E6B52] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(46,81,64,0.24)] transition-all hover:bg-[#2E5140] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus size={14} />
            {adding
              ? "Adding…"
              : `Add ${selected.length > 0 ? selected.length : ""}`.trim()}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
