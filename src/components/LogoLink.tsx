"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export function LogoLink() {
  const { user, isLoaded } = useUser();

  // Determine the href based on user role
  const getHref = () => {
    if (!isLoaded || !user) {
      return "/";
    }

    const role = user.publicMetadata?.role as string;

    if (role === "teacher") {
      return "/teacher";
    } else if (role === "student") {
      return "/student";
    }

    return "/";
  };

  return (
    <Link href={getHref()} className="flex items-center gap-3 font-semibold text-lg text-foreground">
      <span className="flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground font-bold tracking-wide">
        GM
      </span>
      <div className="leading-tight">
        <div>GradeMeIn</div>
        <div className="text-xs font-normal text-muted-foreground">Teach with confidence. Grade with trust.</div>
      </div>
    </Link>
  );
}
