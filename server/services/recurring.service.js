// services/recurring.service.js
// Hourly job: spawn new task instances for any recurring template whose nextRunAt has passed.
const Task = require("../models/Task");
const { nextSequence } = require("../models/Counter");
const { sendNotificationToMany } = require("./notification.service");

const FREQ_MS = {
  daily:    1,
  weekly:   7,
  biweekly: 14,
  monthly:  null, // handled separately via Date arithmetic
};

function computeNextRunAt(base, frequency) {
  const d = new Date(base);
  switch (frequency) {
    case "daily":    d.setDate(d.getDate() + 1);    break;
    case "weekly":   d.setDate(d.getDate() + 7);    break;
    case "biweekly": d.setDate(d.getDate() + 14);   break;
    case "monthly":  d.setMonth(d.getMonth() + 1);  break;
    default:         d.setDate(d.getDate() + 7);    break;
  }
  return d;
}

async function spawnRecurringTasks(io) {
  const now = new Date();
  let due;
  try {
    due = await Task.find({
      isRecurring: true,
      "recurringConfig.nextRunAt": { $lte: now },
    }).lean();
  } catch (err) {
    console.error("[recurring] Query failed:", err.message);
    return;
  }

  if (!due.length) return;
  console.log(`[recurring] Spawning ${due.length} task(s)…`);

  for (const template of due) {
    try {
      const frequency  = template.recurringConfig?.frequency || "weekly";
      const baseDate   = template.dueDate ? new Date(template.dueDate) : now;
      const newDueDate = computeNextRunAt(baseDate, frequency);
      const nextRunAt  = computeNextRunAt(now, frequency);

      // Clone the template into a fresh task instance
      const seq    = await nextSequence("task");
      const taskId = `ZRC-TSK-${String(seq).padStart(5, "0")}`;

      const newTask = await Task.create({
        taskId,
        title:          template.title,
        description:    template.description || "",
        category:       template.category,
        projectId:      template.projectId    || null,
        contentItemId:  template.contentItemId || null,
        assignedTo:     template.assignedTo   || [],
        assignedBy:     template.assignedBy   || null,
        priority:       template.priority     || "medium",
        estimatedHours: template.estimatedHours || 0,
        tags:           template.tags          || [],
        dueDate:        newDueDate,
        isRecurring:    false,   // spawned instances are not themselves recurring
        createdBy:      template.createdBy || null,
      });

      // Advance the template's nextRunAt
      await Task.findByIdAndUpdate(template._id, {
        "recurringConfig.nextRunAt": nextRunAt,
      });

      // Notify all assignees
      if (io && template.assignedTo?.length) {
        await sendNotificationToMany(
          io,
          template.assignedTo.map(String),
          {
            type:  "task_assigned",
            title: "Recurring task ready",
            body:  template.title,
            link:  `/tasks/${newTask._id}`,
            data:  { taskId: newTask._id },
          }
        );
      }

      console.log(`[recurring] Spawned ${taskId} from template ${template.taskId}`);
    } catch (err) {
      console.error(`[recurring] Failed to spawn from ${template._id}:`, err.message);
    }
  }
}

function startRecurringCron(io) {
  // Run immediately once, then every hour
  spawnRecurringTasks(io).catch(() => {});
  setInterval(() => spawnRecurringTasks(io).catch(() => {}), 60 * 60 * 1000);
  console.log("🔁 Recurring task cron started (hourly)");
}

module.exports = { startRecurringCron, spawnRecurringTasks };
