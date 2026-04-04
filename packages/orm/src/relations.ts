import { relations } from 'drizzle-orm/relations';
import {
  toolCalls,
  approvals,
  tasks,
  sessions,
  artifacts,
  messages,
  plans,
  sessionEvents,
  workspaces
} from './schema.js';

export const approvalsRelations = relations(approvals, ({ one }) => ({
  toolCall: one(toolCalls, {
    fields: [approvals.toolCallId],
    references: [toolCalls.id]
  }),
  task: one(tasks, {
    fields: [approvals.taskId],
    references: [tasks.id]
  }),
  session: one(sessions, {
    fields: [approvals.sessionId],
    references: [sessions.id]
  })
}));

export const toolCallsRelations = relations(toolCalls, ({ one, many }) => ({
  approvals: many(approvals),
  artifacts: many(artifacts),
  message: one(messages, {
    fields: [toolCalls.messageId],
    references: [messages.id]
  }),
  task: one(tasks, {
    fields: [toolCalls.taskId],
    references: [tasks.id]
  }),
  session: one(sessions, {
    fields: [toolCalls.sessionId],
    references: [sessions.id]
  })
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  approvals: many(approvals),
  artifacts: many(artifacts),
  messages: many(messages),
  sessionEvents: many(sessionEvents),
  task: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: 'tasks_parentTaskId_tasks_id'
  }),
  tasks: many(tasks, {
    relationName: 'tasks_parentTaskId_tasks_id'
  }),
  plan: one(plans, {
    fields: [tasks.planId],
    references: [plans.id]
  }),
  session: one(sessions, {
    fields: [tasks.sessionId],
    references: [sessions.id]
  }),
  toolCalls: many(toolCalls)
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  approvals: many(approvals),
  artifacts: many(artifacts),
  messages: many(messages),
  plans: many(plans),
  sessionEvents: many(sessionEvents),
  workspace: one(workspaces, {
    fields: [sessions.workspaceId],
    references: [workspaces.id]
  }),
  tasks: many(tasks),
  toolCalls: many(toolCalls)
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  toolCall: one(toolCalls, {
    fields: [artifacts.toolCallId],
    references: [toolCalls.id]
  }),
  task: one(tasks, {
    fields: [artifacts.taskId],
    references: [tasks.id]
  }),
  session: one(sessions, {
    fields: [artifacts.sessionId],
    references: [sessions.id]
  })
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  task: one(tasks, {
    fields: [messages.taskId],
    references: [tasks.id]
  }),
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id]
  }),
  toolCalls: many(toolCalls)
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  session: one(sessions, {
    fields: [plans.sessionId],
    references: [sessions.id]
  }),
  tasks: many(tasks)
}));

export const sessionEventsRelations = relations(sessionEvents, ({ one }) => ({
  task: one(tasks, {
    fields: [sessionEvents.taskId],
    references: [tasks.id]
  }),
  session: one(sessions, {
    fields: [sessionEvents.sessionId],
    references: [sessions.id]
  })
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  sessions: many(sessions)
}));
