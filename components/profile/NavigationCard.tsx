"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

export default function NavigationCard({
  href,
  icon: Icon,
  title,
  description,
  index = 0,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: 0.05 * index, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
    >
      <Link
        href={href}
        className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E7E5DE] bg-white p-5 shadow-[0_1px_2px_rgba(23,32,27,0.04)] transition-colors duration-300 hover:border-[#2F6B4F]/25"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#2F6B4F]/[0.05] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        <div className="relative flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F3EF] text-[#2F6B4F] transition-colors duration-200 group-hover:bg-[#2F6B4F] group-hover:text-white">
            <Icon size={18} strokeWidth={2} />
          </span>
          <ArrowUpRight
            size={17}
            className="text-[#9BA39C] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2F6B4F]"
          />
        </div>

        <div className="relative mt-4">
          <p className="text-sm font-semibold text-[#17201B]">{title}</p>
          <p className="mt-0.5 text-xs text-[#9BA39C]">{description}</p>
        </div>
      </Link>
    </motion.div>
  );
}