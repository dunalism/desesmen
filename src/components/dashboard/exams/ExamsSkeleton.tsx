"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ExamsSkeleton() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 bg-background animate-pulse">
      {/* Header Skeleton Section */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-60 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-11 w-52 rounded-xl shrink-0" />
      </div>

      {/* Grid Card Ujian Tiruan (3 Kolom Struktur Identik dengan ExamCard) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="flex flex-col border border-muted shadow-sm h-64 rounded-xl"
          >
            <CardContent className="p-6 flex-1 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 w-full">
                  <Skeleton className="h-5 w-2/3 rounded-md" />
                  <Skeleton className="h-3.5 w-1/3 rounded-md" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              </div>
              <div className="bg-muted/30 rounded-lg p-3.5 space-y-2.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-12" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 border-t bg-muted/10 rounded-b-xl flex justify-between">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
