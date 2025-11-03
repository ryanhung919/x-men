import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/components/ui/back-button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { SubtaskLink } from "@/components/tasks/subtask-link"
import { enUS } from "date-fns/locale"
import { getTaskById, getAllUsers, getAllProjects } from "@/lib/db/tasks"
import { formatTaskDetails } from "@/lib/services/tasks"
import { EditableDescription } from "@/components/tasks/editable-description"
import { EditableTitle } from "@/components/tasks/editable-title"
import { EditablePriority } from "@/components/tasks/editable-priority"
import { EditableStatus } from "@/components/tasks/editable-status"
import { EditableAssignees } from "@/components/tasks/editable-assignees"
import { EditableDeadline } from "@/components/tasks/editable-deadline"
import { EditableProject } from "@/components/tasks/editable-project"
import { EditableNotes } from "@/components/tasks/editable-notes"
import { EditableTags } from "@/components/tasks/editable-tags"
import { TaskAttachments } from "@/components/tasks/task-attachments"
import { EditableRecurrence } from "@/components/tasks/editable-recurrence"
import { getRolesForUserClient } from "@/lib/db/roles"
import { ArchiveButton } from "@/components/tasks/archive-button"
import { Separator } from "@/components/ui/separator"
import { TaskComments } from "@/components/tasks/task-comments"
import { checkUserIsAdmin } from "@/lib/db/tasks"
import { CreateSubtaskButton } from "@/components/tasks/create-subtask-wrapper"

export default async function TaskDetailsPage({ params }: { params: Promise<{ taskId: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const isAdmin = await checkUserIsAdmin(user.id)

  const resolvedParams = await params
  const taskId = Number.parseInt(resolvedParams.taskId, 10)
  if (isNaN(taskId)) {
    notFound()
  }

  const rawData = await getTaskById(taskId)
  if (!rawData) {
    notFound()
  }

  const task = formatTaskDetails(rawData)
  if (!task) {
    notFound()
  }

  const roles = await getRolesForUserClient(supabase, user.id)
  const isManager = roles.includes("manager")

  const allUsers = await getAllUsers()
  const allProjects = await getAllProjects()

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">Task Details</h1>
        </div>
        {isManager && <ArchiveButton taskId={task.id} subtaskCount={task.subtasks.length} />}
      </div>

      <div className="space-y-6">
        {/* Main Task Card */}
        <Card>
          <CardHeader className="pb-4">
            <EditableTitle taskId={task.id} initialTitle={task.title} />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">DESCRIPTION</h3>
              <EditableDescription taskId={task.id} initialDescription={task.description} />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">STATUS</h3>
                <EditableStatus taskId={task.id} initialStatus={task.status as any} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">PRIORITY</h3>
                <EditablePriority taskId={task.id} initialPriority={task.priority} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">DEADLINE</h3>
                <EditableDeadline taskId={task.id} initialDeadline={task.deadline} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">PROJECT</h3>
                <EditableProject
                  taskId={task.id}
                  initialProjectId={task.project?.id || null}
                  initialProjectName={task.project?.name || null}
                  allProjects={allProjects}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">ASSIGNEES</h3>
              <EditableAssignees
                taskId={task.id}
                initialAssignees={task.assignees.map((a) => ({
                  id: a.assignee_id,
                  first_name: a.user_info.first_name,
                  last_name: a.user_info.last_name,
                }))}
                allUsers={allUsers}
                isManager={isManager}
              />
            </div>

            <Separator />

            {/* Creator */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">CREATOR</h3>
              <p className="text-base">
                {task.creator.user_info.first_name} {task.creator.user_info.last_name}
              </p>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">NOTES</h3>
              <EditableNotes taskId={task.id} initialNotes={task.notes} />
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">TAGS</h3>
              <EditableTags taskId={task.id} initialTags={task.tags} />
            </div>

            <Separator />

            {/* Recurrence */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">RECURRENCE</h3>
              {task.recurrence_interval > 0 ? (
                <EditableRecurrence
                  taskId={task.id}
                  recurrenceInterval={task.recurrence_interval}
                  recurrenceDate={task.recurrence_date}
                />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">No recurrence set</p>
                  <EditableRecurrence taskId={task.id} recurrenceInterval={0} recurrenceDate={null} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subtasks Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xl font-semibold">Subtasks</CardTitle>
            <CreateSubtaskButton
              parentTaskId={task.id}
              parentProjectId={task.project?.id || 0}
              parentProjectName={task.project?.name}
            />
          </CardHeader>
          <CardContent>
            {task.subtasks.length > 0 ? (
              <ul className="space-y-3">
                {task.subtasks.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <SubtaskLink id={sub.id} title={sub.title} />
                    <Badge variant="outline" className="ml-auto">
                      {sub.status}
                    </Badge>
                    {sub.deadline ? (
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        Due: {format(new Date(sub.deadline), "PPP", { locale: enUS })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No subtasks.</p>
            )}
          </CardContent>
        </Card>

        {/* Attachments Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskAttachments taskId={task.id} initialAttachments={task.attachments} />
          </CardContent>
        </Card>

        {/* Comments Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskComments taskId={task.id} comments={task.comments} currentUserId={user.id} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
