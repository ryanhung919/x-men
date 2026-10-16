'use client';
import { useState } from 'react';
import { Bell, CheckCheck, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationItem, type Notification } from './notification-item';
import { NotificationModal } from './notification-modal';
import { useNotifications } from '@/hooks/use-notifications';

export function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isDeleting,
    error,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
    handleDeleteAll,
    refetch,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative transition-colors duration-150 hover:bg-accent"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 p-0 sm:w-[420px] sm:max-w-[420px]">
        <SheetHeader className="border-b p-6 pr-12">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Bell className="size-3.5 text-positive" />
            Your inbox
          </div>
          <SheetTitle className="text-2xl font-semibold tracking-tight">Notifications</SheetTitle>
          <SheetDescription>
            {unreadCount
              ? `${unreadCount} unread updates to catch up on.`
              : "You're up to date with your workspace."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMarkAllAsRead}
            disabled={!unreadCount || isDeleting || isLoading}
            className="px-2 text-xs"
          >
            <CheckCheck className="mr-1.5 size-4" />
            Mark all read
          </Button>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Refresh notifications"
              disabled={isLoading || isDeleting}
              onClick={refetch}
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!notifications.length || isDeleting || isLoading}
                  className="px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear your notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all notifications from your inbox. Your tasks and workspace stay as
                    they are.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep notifications</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDeleteAll}
                  >
                    Delete all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {error && (
          <div
            role="alert"
            className="border-b border-problem/20 bg-problem-soft px-5 py-3 text-xs text-problem"
          >
            {error}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={isLoading || isDeleting}>
          {isDeleting ? (
            <div
              aria-live="polite"
              className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" />
              Deleting notifications…
            </div>
          ) : isLoading ? (
            <div aria-live="polite" aria-label="Loading notifications" className="space-y-6 p-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center px-7 py-20 text-center">
              <span className="mb-5 flex size-12 items-center justify-center rounded-2xl border bg-positive-soft text-positive">
                <CheckCheck className="size-5" />
              </span>
              <h3 className="font-medium">All clear</h3>
              <p className="mt-2 max-w-56 text-sm leading-relaxed text-muted-foreground">
                No notifications yet. New updates from your team will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkAsRead={handleMarkAsRead}
                onClick={(n) => {
                  setSelectedNotification(n);
                  setIsModalOpen(true);
                }}
              />
            ))
          )}
        </div>
        <p className="border-t px-6 py-3 text-[11px] text-muted-foreground">
          Task updates and reminders, all in one place.
        </p>
      </SheetContent>
      <NotificationModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDelete}
      />
    </Sheet>
  );
}
