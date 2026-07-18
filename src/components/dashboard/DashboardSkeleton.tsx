"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AssessmentCardSkeleton } from "@/components/dashboard/AssessmentCardSkeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full animate-pulse">
      {/* Skeleton Greeting */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>

      {/* Skeleton Hero CTA Block */}
      <Card className="border border-muted shadow-sm rounded-2xl">
        <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 w-full max-w-xl">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-7 w-3/4 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-12 w-44 rounded-xl shrink-0" />
        </CardContent>
      </Card>

      {/* Skeleton Statistics Aggregate Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Skeleton History Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-5 w-44 rounded-md" />
          </div>
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>

        {/* Menggunakan AssessmentCardSkeleton reusable yang sudah kita buat sebelumnya! */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <AssessmentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
