import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Archive, RotateCcw, Trash2, Check } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { companyLessonsApi } from "../api/companyLessons";
import type { CompanyLesson } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TYPE_LABELS = {
  procedure: "Procédure",
  fact: "Fait",
  antibody: "Anticorps"
};

function getTypeBadgeVariant(type: string) {
  switch (type) {
    case "procedure":
      return "default"; // Blue
    case "fact":
      return "secondary"; // Green
    case "antibody":
      return "destructive"; // Red/Orange
    default:
      return "outline";
  }
}

export function CompanyLessons() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState("draft");

  useEffect(() => {
    setBreadcrumbs([{ label: "Leçons IA" }]);
  }, [setBreadcrumbs]);

  const { data: lessons, isLoading } = useQuery({
    queryKey: queryKeys.companyLessons.list(selectedCompanyId!, activeTab),
    queryFn: () => companyLessonsApi.list(selectedCompanyId!, activeTab),
    enabled: !!selectedCompanyId,
  });

  const updateLesson = useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: Record<string, unknown> }) =>
      companyLessonsApi.update(selectedCompanyId!, lessonId, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.companyLessons.list(selectedCompanyId!, "draft") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.companyLessons.list(selectedCompanyId!, "active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.companyLessons.list(selectedCompanyId!, "archived") }),
      ]);
      pushToast({ title: "Updated", body: "Lesson status updated.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  const deleteLesson = useMutation({
    mutationFn: (lessonId: string) => companyLessonsApi.delete(selectedCompanyId!, lessonId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.companyLessons.list(selectedCompanyId!, "draft") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.companyLessons.list(selectedCompanyId!, "active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.companyLessons.list(selectedCompanyId!, "archived") }),
      ]);
      pushToast({ title: "Deleted", body: "Lesson deleted.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
        <BookOpen className="h-8 w-8 opacity-40" />
        <p className="text-sm">Select a company to view AI lessons</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">AI Lessons</h1>
        <p className="text-sm text-muted-foreground">
          Review and activate lessons extracted by the AI learning loop.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="draft" className="space-y-4">
          {(lessons ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-40" />
              <p className="text-sm">No draft lessons</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(lessons ?? []).map((lesson: CompanyLesson) => (
                <Card key={lesson.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getTypeBadgeVariant(lesson.type)}>
                            {TYPE_LABELS[lesson.type] || lesson.type}
                          </Badge>
                          {lesson.issueId && (
                            <Badge variant="outline">
                              Issue #{lesson.issueId.slice(0, 8)}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(lesson.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{lesson.rule}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateLesson.mutate({ lessonId: lesson.id, data: { status: "active" } })}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Activate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateLesson.mutate({ lessonId: lesson.id, data: { status: "archived" } })}
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          Archive
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLesson.mutate(lesson.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {(lessons ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-40" />
              <p className="text-sm">No active lessons</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(lessons ?? []).map((lesson: CompanyLesson) => (
                <Card key={lesson.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getTypeBadgeVariant(lesson.type)}>
                            {TYPE_LABELS[lesson.type] || lesson.type}
                          </Badge>
                          {lesson.issueId && (
                            <Badge variant="outline">
                              Issue #{lesson.issueId.slice(0, 8)}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(lesson.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{lesson.rule}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateLesson.mutate({ lessonId: lesson.id, data: { status: "archived" } })}
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          Archive
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {(lessons ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-40" />
              <p className="text-sm">No archived lessons</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(lessons ?? []).map((lesson: CompanyLesson) => (
                <Card key={lesson.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getTypeBadgeVariant(lesson.type)}>
                            {TYPE_LABELS[lesson.type] || lesson.type}
                          </Badge>
                          {lesson.issueId && (
                            <Badge variant="outline">
                              Issue #{lesson.issueId.slice(0, 8)}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(lesson.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{lesson.rule}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateLesson.mutate({ lessonId: lesson.id, data: { status: "draft" } })}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}