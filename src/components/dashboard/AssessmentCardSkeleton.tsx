"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AssessmentCardSkeleton() {
  return (
    <Card className="flex flex-col h-full border border-muted shadow-sm">
      {/* Header Skeleton */}
      <CardHeader className="pb-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2 w-full">
          {/* Badge Tipe Soal */}
          <Skeleton className="h-5 w-24 rounded-full" />
          {/* Tanggal */}
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        {/* Title Snippet (2 baris tiruan) */}
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>
      </CardHeader>

      {/* Content Skeleton */}
      <CardContent className="pb-3 space-y-3">
        {/* Info Box Tiruan */}
        <div className="bg-muted/40 rounded-lg p-3 space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-3.5 w-16 rounded-md" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-3.5 w-12 rounded-md" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-3.5 w-24 rounded-md" />
          </div>
        </div>
      </CardContent>

      {/* Footer Skeleton */}
      <CardFooter className="pt-2 border-t flex justify-between gap-1 bg-muted/10 rounded-b-xl flex-wrap">
        {/* Tombol Delete */}
        <Skeleton className="h-8 w-8 rounded-lg" />

        <div className="flex gap-1.5 ml-auto">
          {/* Tombol Pilih Soal */}
          <Skeleton className="h-8 w-20 rounded-lg" />
          {/* Tombol Buka Paket */}
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </CardFooter>
    </Card>
  );
}
