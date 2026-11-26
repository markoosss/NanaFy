import { describe, expect, it } from "vitest";
import { parseCareScheduleInput } from "./schedule-input";

describe("care schedule input validation", () => {
  it("accepts a feeding schedule with optional portion", () => {
    expect(
      parseCareScheduleInput({
        kind: "feeding",
        mealName: "Comida",
        portion: null,
        dayOfWeek: 7,
        scheduledTime: "08:30",
        isActive: true,
      }),
    ).toMatchObject({
      kind: "feeding",
      mealName: "Comida",
      dayOfWeek: 7,
      scheduledTime: "08:30",
    });
  });

  it("normalizes database medication times with seconds when editing a schedule", () => {
    expect(
      parseCareScheduleInput({
        kind: "medication",
        medicationName: "Medicación",
        instructions: "Con comida",
        startDate: "2026-11-25",
        endDate: null,
        times: [
          { dayOfWeek: 3, scheduledTime: "08:30:00" },
          { dayOfWeek: 3, scheduledTime: "20:45:12.250000" },
        ],
        isActive: true,
        id: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toMatchObject({
      kind: "medication",
      times: [
        { dayOfWeek: 3, scheduledTime: "08:30" },
        { dayOfWeek: 3, scheduledTime: "20:45" },
      ],
    });
  });

  it("rejects duplicate medication times after normalizing seconds", () => {
    expect(
      parseCareScheduleInput({
        kind: "medication",
        medicationName: "Medicación",
        instructions: "Con comida",
        startDate: "2026-11-25",
        endDate: null,
        times: [
          { dayOfWeek: 3, scheduledTime: "08:30" },
          { dayOfWeek: 3, scheduledTime: "08:30:00" },
        ],
        isActive: true,
      }),
    ).toBeNull();
  });

  it("rejects invalid days, dates, times, and duplicate medication times", () => {
    expect(
      parseCareScheduleInput({
        kind: "feeding",
        mealName: "Comida",
        dayOfWeek: 0,
        scheduledTime: "25:90",
        isActive: true,
      }),
    ).toBeNull();

    expect(
      parseCareScheduleInput({
        kind: "medication",
        medicationName: "Medicamento",
        instructions: "Con comida",
        startDate: "2026-02-30",
        endDate: null,
        times: [{ dayOfWeek: 1, scheduledTime: "08:00" }],
        isActive: true,
      }),
    ).toBeNull();

    expect(
      parseCareScheduleInput({
        kind: "medication",
        medicationName: "Medicamento",
        instructions: "Con comida",
        startDate: "2026-02-28",
        endDate: "2026-02-27",
        times: [
          { dayOfWeek: 1, scheduledTime: "08:00" },
          { dayOfWeek: 1, scheduledTime: "08:00" },
        ],
        isActive: true,
      }),
    ).toBeNull();
  });
});
