import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  BadgeCheck,
  Building2,
  Eye,
  Ruler,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { BackToHomeButton } from "@/components/ui/BackToHomeButton";

type SearchParams = {
  tab?: string | string[];
};

const TABS = [
  { key: "about-us", label: "About Us" },
  { key: "project-team", label: "Project Team" },
] as const;

const features = [
  {
    code: "COST",
    title: "Predictive Cost Modelling",
    description:
      "Identifies high-cost building elements and suggests cost-optimised alternatives.",
  },
  {
    code: "FRMW",
    title: "Framework-Driven Guidance",
    description:
      "Uses the Cost Reduction via Client Satisfaction Framework to align decisions with cost efficiency and stakeholder needs.",
  },
  {
    code: "GBI",
    title: "Green Compliance",
    description:
      "Maps construction strategies to GBI and other sustainability rating systems.",
  },
  {
    code: "DSS",
    title: "Decision Support Tools",
    description:
      "Scenario analysis for budgeting, materials, and lifecycle savings.",
  },
];

const whyMatters = [
  {
    id: 5,
    image: "/images/developer.png",
    title: "For Developers",
    description:
      "Minimise upfront cost risk while maintaining long-term green building certification.",
  },
  {
    id: 6,
    image: "/images/contractor.png",
    title: "For Contractors & Consultants",
    description:
      "Gain clarity in cost distribution, material choices, and design strategies.",
  },
  {
    id: 7,
    image: "/images/policymaker.png",
    title: "For Policy Makers",
    description:
      "Support data-backed incentives and sustainable construction policies.",
  },
  {
    id: 8,
    image: "/images/community.png",
    title: "For Communities",
    description:
      "Encourage greener buildings that are economically viable, socially inclusive, and environmentally responsible.",
  },
];

const teamMembers = [
  {
    id: 1,
    code: "QS-L",
    name: "AP. Sr. Ts. Dr. Afzan Ahmad Zaini",
    role: "Leader & Quantity Surveyor Consultant",
    image: "/images/team_member_1.png",
  },
  {
    id: 2,
    code: "QS-C",
    name: "Prof. Sr. Dr Padzil @ Fadzil Hassan",
    role: "Quantity Surveyor Consultant",
    image: "/images/team_member_2.png",
  },
  {
    id: 3,
    code: "ENG",
    name: "AP. Dr Norhuzaimin Julai",
    role: "Engineering Consultant",
    image: "/images/team_member_3.png",
  },
  {
    id: 4,
    code: "ITC",
    name: "Ts. Nurfauza Jali",
    role: "IT Consultant",
    image: "/images/team_member_4.png",
  },
  {
    id: 5,
    code: "QS",
    name: "Nur Khairina Khairul Hisham",
    role: "Quantity Surveyor",
    image: "/images/team_member_5.png",
  },
  {
    id: 6,
    code: "PGM",
    name: "Ling Sie Jie",
    role: "Programmer",
    image: "/images/team_member_6.png",
  },
];

export const metadata = {
  title: "About Us | ProFormaX",
  description:
    "Learn about ProFormaX and meet the project team behind the platform.",
};

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeTab = normalizeTab(params.tab);

  return (
    <div className="space-y-6 py-8">
      <BackToHomeButton />
      <HeroTitleBlock activeTab={activeTab} />
      {activeTab === "about-us" ? <AboutUsTab /> : <ProjectTeamTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero — styled as a drawing-sheet title block                        */
/* ------------------------------------------------------------------ */

function HeroTitleBlock({ activeTab }: { activeTab: string }) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-[#E4E1D8] bg-[#1E2621] text-[#F6F6F2] shadow-[0_18px_48px_rgba(16,49,36,0.18)]">
      <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: headline + mission + tabs */}
        <div className="flex flex-col gap-6 p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Image
                src="/logo/proformax-white.png"
                alt="ProFormaX"
                width={30}
                height={30}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#9FB6A6]">
              ProFormaX / About
            </p>
          </div>

          <h1 className="max-w-xl text-3xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-[2.6rem]">
            Green construction, priced with confidence.
          </h1>

          <p className="max-w-lg text-sm leading-7 text-[#D7E4DA] sm:text-base">
            ProFormaX helps developers, contractors, and policymakers weigh
            sustainability against real cost — so compliant buildings stay
            buildable.
          </p>

          <nav
            aria-label="About page navigation"
            className="inline-flex w-full flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 sm:w-fit"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={`/about?tab=${tab.key}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#1E2621] shadow-[0_10px_24px_rgba(255,255,255,0.18)]"
                      : "text-[#D7E4DA] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: title block, like the metadata box on a drawing sheet */}
        <div className="flex items-center justify-center border-t border-white/10 bg-black/15 p-7 sm:p-9 lg:border-l lg:border-t-0">
          <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-white/15 bg-white/5">
            <div className="flex items-center gap-2 border-b border-white/15 px-4 py-3">
              <Ruler size={14} className="text-[#9FB6A6]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9FB6A6]">
                Title Block
              </span>
            </div>
            <dl className="divide-y divide-white/10 font-mono text-[11px]">
              <TitleBlockRow label="Sheet" value="ABOUT-01" />
              <TitleBlockRow label="Rev" value="1.0.0" />
              <TitleBlockRow label="Scale" value="N.T.S." />
              <TitleBlockRow label="Region" value="Sarawak, MY" />
              <TitleBlockRow label="Status" value="Active" accent />
            </dl>
          </div>
        </div>
      </div>

      {/* thin ruler-tick strip — the one deliberate ornament */}
      <div
        className="h-2 w-full opacity-70"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(246,246,242,0.35) 0 1px, transparent 1px 10px)",
        }}
        aria-hidden
      />
    </section>
  );
}

function TitleBlockRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="uppercase tracking-[0.18em] text-[#9FB6A6]">{label}</dt>
      <dd
        className={
          accent ? "font-semibold text-[#8FD6A8]" : "font-semibold text-white"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* About Us tab                                                        */
/* ------------------------------------------------------------------ */

function AboutUsTab() {
  return (
    <div className="space-y-6">
      <section className="grid overflow-hidden rounded-[28px] border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)] md:grid-cols-2">
        <InfoPanel
          icon={<Target size={18} />}
          eyebrow="Purpose"
          description="To bridge the gap between green construction practices and economic feasibility. By integrating advanced modelling and validated frameworks, the platform empowers stakeholders to make smarter financial and technical decisions that reduce risk, improve cost transparency, and enhance client satisfaction."
        />
        <InfoPanel
          icon={<Eye size={18} />}
          eyebrow="Vision"
          description="To become the leading digital platform that empowers stakeholders to understand and manage green construction costs with clarity, while driving the acceleration of sustainable development in Malaysia and beyond, where sustainability and affordability go hand in hand."
          divider
        />
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
        <div className="flex items-center gap-3 border-b border-[#EFEDE6] bg-[#FBFAF7] px-6 py-4 sm:px-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBF6EE] text-[#2F7A4D]">
            <Sparkles size={17} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-[-0.02em] text-[#1E2621]">
              Feature Schedule
            </h2>
            <p className="text-xs text-[#7C8880]">
              Core capabilities, referenced like a drawing schedule.
            </p>
          </div>
        </div>

        {/* header row */}
        <div className="hidden grid-cols-[90px_220px_1fr] bg-[#1E2621] font-mono text-[10px] uppercase tracking-[0.2em] text-[#DDE9E1] sm:grid">
          <div className="px-6 py-2.5">Code</div>
          <div className="px-6 py-2.5">Item</div>
          <div className="px-6 py-2.5">Description</div>
        </div>

        {features.map((feature) => (
          <FeatureRow key={feature.code} {...feature} />
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-[#1E2621]">
              Who It&apos;s Built For
            </h2>
            <p className="mt-1 text-sm text-[#5B655F]">
              Certified thinking for every stakeholder in the project.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#E4E1D8] bg-white px-4 py-2 text-xs font-semibold text-[#3E6B52] shadow-[0_8px_18px_rgba(30,38,33,0.05)] md:inline-flex">
            <BadgeCheck size={14} />
            Cost aware, sustainability ready
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {whyMatters.map((item) => (
            <MatterCard
              key={item.id}
              image={item.image}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </section>

      <footer className="rounded-[24px] border border-[#E4E1D8] bg-[#FBFAF7] px-5 py-4 text-center font-mono text-xs text-[#7C8880] shadow-[0_8px_20px_rgba(30,38,33,0.04)]">
        <span className="font-semibold text-[#1E2621]">v1.0.0</span>
        <span className="mx-2">·</span>
        <span>© 2025 ProFormaX. All rights reserved.</span>
      </footer>
    </div>
  );
}

function InfoPanel({
  icon,
  eyebrow,
  description,
  divider,
}: {
  icon: ReactNode;
  eyebrow: string;
  description: string;
  divider?: boolean;
}) {
  return (
    <article
      className={`p-6 sm:p-8 ${
        divider ? "border-t border-[#EFEDE6] md:border-l md:border-t-0" : ""
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF6EE] text-[#2F7A4D]">
          {icon}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#7C8880]">
          {eyebrow}
        </span>
      </div>
      <p className="text-sm leading-7 text-[#5B655F]">{description}</p>
    </article>
  );
}

function FeatureRow({
  code,
  title,
  description,
}: {
  code: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 border-t border-[#EFEDE6] px-6 py-4 odd:bg-[#FBFAF7] sm:grid-cols-[90px_220px_1fr] sm:items-start sm:gap-0 sm:py-3.5 sm:px-0">
      <div className="sm:px-6">
        <span className="inline-flex rounded-md bg-[#EBF6EE] px-2 py-0.5 font-mono text-[11px] font-bold tracking-[0.06em] text-[#2F7A4D]">
          {code}
        </span>
      </div>
      <div className="sm:px-6">
        <h3 className="text-sm font-semibold text-[#1E2621]">{title}</h3>
      </div>
      <div className="sm:px-6">
        <p className="text-sm leading-6 text-[#5B655F]">{description}</p>
      </div>
    </div>
  );
}

function MatterCard({
  image,
  title,
  description,
}: {
  image: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[28px] border border-[#E4E1D8] bg-white p-5 shadow-[0_8px_24px_rgba(30,38,33,0.05)] transition-transform duration-200 hover:-translate-y-1">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#3E6B52]/30 p-1">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#F6F6F2]">
            <Image
              src={image}
              alt={title}
              width={48}
              height={48}
              className="h-9 w-9 object-contain"
            />
          </div>
        </div>
        <h3 className="text-base font-bold tracking-[-0.02em] text-[#1E2621]">
          {title}
        </h3>
      </div>
      <p className="text-sm leading-7 text-[#5B655F]">{description}</p>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Project Team tab                                                     */
/* ------------------------------------------------------------------ */

function ProjectTeamTab() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#E4E1D8] bg-white p-6 shadow-[0_8px_24px_rgba(30,38,33,0.05)] sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EBF6EE] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#2F7A4D]">
              <Users size={13} />
              Project Roster
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#1E2621] sm:text-3xl">
              Meet the professionals behind the platform
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#5B655F] sm:text-base">
              Dedicated professionals bringing expertise in construction,
              sustainability, and technology to make green building affordable.
            </p>
          </div>

          <div className="rounded-3xl border border-[#E4E1D8] bg-[#FBFAF7] px-5 py-4 shadow-[0_8px_18px_rgba(30,38,33,0.04)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#7C8880]">
              Crew Size
            </p>
            <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#1E2621]">
              {teamMembers.length}
            </p>
            <p className="mt-1 text-sm text-[#5B655F]">Experts working together</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {teamMembers.map((member) => (
          <TeamMemberCard key={member.id} member={member} />
        ))}
      </section>

      <section className="rounded-[24px] border border-[#D8EDDC] bg-[#EBF6EE] px-5 py-4 text-center shadow-[0_8px_20px_rgba(30,38,33,0.04)]">
        <p className="text-sm font-semibold text-[#1E2621]">
          Together, we&apos;re building a sustainable future.
        </p>
      </section>
    </div>
  );
}

function TeamMemberCard({
  member,
}: {
  member: {
    id: number;
    code: string;
    name: string;
    role: string;
    image: string;
  };
}) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
      <div className="flex items-center justify-between bg-[#1E2621] px-5 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9FB6A6]">
          ID Badge
        </span>
        <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
          {member.code}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E4E1D8] bg-[#F6F6F2]">
            <Image
              src={member.image}
              alt={member.name}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-6 text-[#1E2621]">
              {member.name}
            </h3>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#EBF6EE] px-3 py-1 text-xs font-semibold text-[#2F7A4D]">
              <Building2 size={13} />
              {member.role}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function normalizeTab(tab: SearchParams["tab"]) {
  const value = Array.isArray(tab) ? tab[0] : tab;
  return value === "project-team" ? "project-team" : "about-us";
}