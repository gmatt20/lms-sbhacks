"use client";

import { Body } from "@/components/body/Body";
import Pdf from "@/components/uploader/pdf";
import { useAuth } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <div>
      <div className="mb-5 text-3xl bold">Next.js Voice Agent</div>
      {isSignedIn && <Body />}
      <Pdf />
    </div>
  );
}
