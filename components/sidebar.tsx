"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Camera,
  ZoomIn,
  Users,
  Shirt,
  UserCheck,
  Wand2,
  ScanFace,
  History,
  LogOut,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Job, Project } from "@/types";

const projectNavItems = [
  { href: "/dashboard/projects", label: "All Projects", icon: FolderOpen },
];

const navItems = [
  { href: "/dashboard/upscale", label: "Upscale", icon: ZoomIn },
  { href: "/dashboard/face-swap", label: "Face Swap", icon: Users },
  { href: "/dashboard/try-on", label: "Try-On", icon: Shirt },
  { href: "/dashboard/consistency", label: "Consistency", icon: UserCheck },
  { href: "/dashboard/adjust", label: "Adjust", icon: Wand2 },
];

const bottomItems = [
  { href: "/dashboard/history", label: "History", icon: History },
];

const featureIcons: Record<string, React.ElementType> = {
  upscale: ZoomIn,
  face_swap: Users,
  try_on: Shirt,
  consistency: UserCheck,
  adjust: Wand2,
  generate_perspective: ScanFace,
};

const featureLabels: Record<string, string> = {
  upscale: "Upscale",
  face_swap: "Face Swap",
  try_on: "Try-On",
  consistency: "Consistency",
  adjust: "Adjust",
  generate_perspective: "Perspective",
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("jobs")
      .select("*")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setRecentJobs(data);
      });
    supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(2)
      .then(({ data }) => {
        if (data) setRecentProjects(data);
      });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 px-4">
        <Camera className="h-5 w-5 text-primary" />
        <span className="font-serif text-xl tracking-tight">Fotograph</span>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Projects
        </p>
        {projectNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith("/dashboard/projects");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {recentProjects.map((project) => (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.id}`}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <span className="flex-1 truncate">{project.name}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground/50">{timeAgo(project.updated_at)}</span>
          </Link>
        ))}

        <Separator className="my-1" />

        <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Tools
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="flex-1" />

        {recentJobs.length > 0 && (
          <>
            <Separator className="my-1" />
            <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Recent
            </p>
            {recentJobs.map((job) => {
              const Icon = featureIcons[job.feature];
              return (
                <Link
                  key={job.id}
                  href="/dashboard/history"
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span className="flex-1 truncate">{featureLabels[job.feature] ?? job.feature}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground/50">{timeAgo(job.created_at)}</span>
                </Link>
              );
            })}
          </>
        )}

        <Separator className="my-2" />

        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </nav>
    </aside>
  );
}
